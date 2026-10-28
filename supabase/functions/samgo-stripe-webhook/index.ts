// SAMGO Stripe Webhook : SANDBOX uniquement. Vérification HMAC du corps brut.
// Pas de JWT côté Stripe ; AUCUNE mise à jour sans signature valide et évènement test.
const URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const SECRET=Deno.env.get("SAMGO_STRIPE_WEBHOOK_TEST_SECRET")||"";
const SIGNATURE_TOLERANCE=300;
function reply(status:number,msg:string):Response{
 return new Response(JSON.stringify({message:msg}),{
  status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
 });
}
function equalHex(a:string,b:string):boolean{
 if(a.length!==b.length || !/^[a-f0-9]+$/i.test(a)||!/^[a-f0-9]+$/i.test(b))return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
async function validSignature(payload:string,header:string):Promise<boolean>{
 if(!SECRET.startsWith("whsec_"))return false;
 let timestamp=0;
 const sigs:string[]=[];
 for(const part of header.split(",")){
  const split=part.split("=");
  if(split.length!==2)continue;
  if(split[0].trim()==="t")timestamp=Number(split[1]);
  if(split[0].trim()==="v1")sigs.push(split[1].trim());
 }
 if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()/1000-timestamp)>SIGNATURE_TOLERANCE||!sigs.length)return false;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(String(timestamp)+"."+payload)));
 const hash=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
 return sigs.some(sig=>equalHex(sig.toLowerCase(),hash));
}
async function query(path:string,method="GET",body?:unknown):Promise<any>{
 if(!URL||!SERVICE)throw new Error("Backend service credentials missing.");
 const response=await fetch(URL+"/rest/v1/"+path,{
  method,
  headers:{"apikey":SERVICE,"Authorization":"Bearer "+SERVICE,
   ...(body===undefined?{}:{"Content-Type":"application/json"}),
   "Prefer":"return=representation"},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 const raw=await response.text();let data:any;
 try{data=raw?JSON.parse(raw):null;}catch{data=null;}
 if(!response.ok)throw new Error("Database rejected test webhook event ("+response.status+").");
 return data;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply(405,"POST only.");
 if(!SECRET.startsWith("whsec_") || !SERVICE)return reply(503,"Stripe test webhook not configured.");
 const header=req.headers.get("stripe-signature")||"";
 const raw=await req.text();
 if(raw.length>200000)return reply(413,"Payload too large.");
 if(!(await validSignature(raw,header)))return reply(400,"Signature Stripe invalide.");
 let event:any;
 try{event=JSON.parse(raw);}catch{return reply(400,"Invalid event JSON.");}
 if(event?.livemode!==false)return reply(400,"Only test events are accepted.");
 const type=String(event?.type||"");
 if(!["checkout.session.completed","checkout.session.async_payment_succeeded",
       "checkout.session.async_payment_failed","checkout.session.expired"].includes(type))
   return reply(200,"Event ignored.");
 const session=event?.data?.object;
 if(!session || session.object!=="checkout.session" || session.livemode!==false ||
    typeof session.id!=="string" || !session.id.startsWith("cs_test_"))return reply(400,"Invalid test session.");
 const choice=String(session.client_reference_id||"");
 if(!/^[a-f0-9-]{36}$/i.test(choice))return reply(400,"Invalid test choice.");
 try{
  const rows=await query("samgo_stripe_paiements_test?"+new URLSearchParams({
   select:"choix_id,client_id,chauffeur_id,montant_centimes,commission_centimes,statut,stripe_session_id",
   choix_id:"eq."+choice,limit:"1"
  }).toString());
  const record=Array.isArray(rows)?rows[0]:null;
  if(!record || record.stripe_session_id!==session.id)return reply(200,"Unknown sandbox session ignored.");
  if(record.statut==="paye_test")return reply(200,"Already recorded.");
  if(record.commission_centimes!==0 || session.metadata?.client_id!==record.client_id ||
     session.metadata?.chauffeur_id!==record.chauffeur_id ||
     session.metadata?.choix_id!==choice ||
     Number(session.amount_total)!==Number(record.montant_centimes) ||
     session.currency!=="eur")return reply(400,"Test payment amount or ownership mismatch.");
  let next:string;
  if(type==="checkout.session.completed"||type==="checkout.session.async_payment_succeeded"){
   if(session.payment_status!=="paid")return reply(200,"Awaiting confirmation.");
   next="paye_test";
  }else if(type==="checkout.session.expired")next="expire_test";
  else next="echec_test";
  await query("samgo_stripe_paiements_test?choix_id=eq."+encodeURIComponent(choice)+"&stripe_session_id=eq."+encodeURIComponent(session.id),
    "PATCH",{statut:next,modifie_le:new Date().toISOString()});
  return reply(200,"Stripe sandbox event recorded.");
 }catch{
  return reply(500,"Temporary server problem. Stripe may retry.");
 }
});
