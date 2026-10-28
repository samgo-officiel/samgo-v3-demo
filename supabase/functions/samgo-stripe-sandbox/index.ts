// SAMGO Stripe Connect — SANDBOX UNIQUEMENT.
// Mode réel volontairement impossible : aucune clé live ni course réelle.
// Secrets à ajouter dans Supabase Edge Functions, jamais dans GitHub Pages :
// SAMGO_STRIPE_TEST_KEY = sk_test_...
// SAMGO_STRIPE_SANDBOX_ENABLED = true
const FRONT = "https://samgo-officiel.github.io";
const SITE = FRONT + "/samgo-v3-demo/";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const stripeKey = Deno.env.get("SAMGO_STRIPE_TEST_KEY") || "";
const enabled = Deno.env.get("SAMGO_STRIPE_SANDBOX_ENABLED") === "true";
const isReady = enabled && stripeKey.startsWith("sk_test_") && !!serviceKey && !!anonKey;
const cors = {
  "Access-Control-Allow-Origin": FRONT,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
function output(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: cors });
}
const uuidRe = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function checkedUuid(value: unknown): string {
  if(typeof value !== "string" || !uuidRe.test(value))throw new Error("Identifiant de simulation invalide.");
  return value;
}
async function apiCall(path: string, method: string, token: string, apikey: string, body?: unknown, opts: Record<string,string> = {}): Promise<any> {
  const response = await fetch(supabaseUrl + "/rest/v1/" + path, {
    method,
    headers: {"apikey": apikey, "Authorization": "Bearer " + token,
      ...(body === undefined ? {} : {"Content-Type":"application/json"}),
      ...opts},
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if(!response.ok) throw new Error("Lecture ou écriture de la base de test indisponible (" + response.status + ").");
  return data;
}
async function readUser(req: Request): Promise<{id:string;email?:string;token:string}> {
  if(!supabaseUrl || !anonKey)throw new Error("Configuration Supabase incomplète.");
  const header = req.headers.get("authorization") || "";
  const match = /^Bearer ([-A-Za-z0-9._~+/=]+)$/.exec(header);
  if(!match) throw new Error("Connectez-vous à SAMGO.");
  const response = await fetch(supabaseUrl + "/auth/v1/user", {
    headers:{"apikey":anonKey,"authorization":header}
  });
  if(!response.ok)throw new Error("Connexion SAMGO expirée, reconnectez-vous.");
  const user = await response.json();
  if(!user || !uuidRe.test(user.id))throw new Error("Utilisateur non reconnu.");
  return {id:user.id,email:user.email,token:match[1]};
}
function qs(input: Record<string,string>): URLSearchParams{
  const form = new URLSearchParams();
  for(const [key,value] of Object.entries(input))form.set(key,value);
  return form;
}
async function stripe(path: string, method: "GET"|"POST", data?: Record<string,string>, idempotency?: string): Promise<any>{
  if(!isReady)throw new Error("Stripe sandbox n'est pas encore configuré sur le serveur SAMGO.");
  const response = await fetch("https://api.stripe.com/v1/" + path,{
    method,
    headers: {
      "Authorization":"Bearer " + stripeKey,
      ...(data ? {"Content-Type":"application/x-www-form-urlencoded"} : {}),
      ...(idempotency ? {"Idempotency-Key":idempotency} : {})
    },
    body: data ? qs(data).toString() : undefined
  });
  const json = await response.json().catch(()=>({}));
  if(!response.ok) {
    const code=String(json?.error?.code||"");
    // Pas de détail sensible du fournisseur dans le navigateur.
    if(code === "account_invalid" || code === "platform_account_required")
      throw new Error("Connect doit être activé dans le compte Stripe de test.");
    throw new Error("Stripe sandbox a refusé l'opération (" + response.status + "). Vérifiez la configuration dans Stripe.");
  }
  if(json?.livemode === true)throw new Error("Compte Stripe réel détecté : opération bloquée.");
  return json;
}
async function adminGet(table:string, query:Record<string,string>):Promise<any[]> {
  return await apiCall(table + "?" + qs(query).toString(),"GET",serviceKey,serviceKey) || [];
}
async function requireApprovedDriver(user:{id:string;token:string}) {
  const data=await apiCall("candidatures_chauffeur?" + qs({
    select:"statut",utilisateur_id:"eq."+user.id,limit:"1"
  }).toString(),"GET",user.token,anonKey);
  if(!Array.isArray(data)||data[0]?.statut!=="approuve")
    throw new Error("Le compte chauffeur doit être approuvé dans la démo SAMGO.");
}
async function mappingFor(userId:string):Promise<string|null>{
  const found=await adminGet("samgo_stripe_chauffeurs_test",{
    select:"stripe_compte_id",utilisateur_id:"eq."+userId,limit:"1"
  });
  return found[0]?.stripe_compte_id||null;
}
async function accountInfo(accountId:string):Promise<any> {
  if(!/^acct_[A-Za-z0-9]+$/.test(accountId))throw new Error("Compte Stripe de test invalide.");
  return stripe("accounts/"+encodeURIComponent(accountId),"GET");
}
async function handle(action:string,body:any,user:{id:string;email?:string;token:string}):Promise<Response>{
  if(action==="status"){
    let driverAccountLinked=false;
    if(isReady){
      const rows=await adminGet("samgo_stripe_chauffeurs_test",{select:"stripe_compte_id",utilisateur_id:"eq."+user.id,limit:"1"});
      driverAccountLinked=rows.length>0;
    }
    return output({sandbox:true,configured:isReady,commission_percent:0,
      driverAccountLinked, payments_enabled:false,
      message:isReady?"Stripe SANDBOX disponible. Aucun paiement réel.":"Stripe connecté à ChatGPT mais clé secrète de test non encore configurée dans Supabase."});
  }
  if(!isReady) return output({error:"Connexion serveur Stripe non terminée. Aucun paiement ne peut être créé."},503);
  if(action==="driver_status"){
    await requireApprovedDriver(user);
    const account=await mappingFor(user.id);
    if(!account)return output({linked:false,onboarding_complete:false,ready_for_test:false});
    const info=await accountInfo(account);
    return output({linked:true,onboarding_complete:!!info.details_submitted,
      ready_for_test:!!info.charges_enabled && !!info.payouts_enabled && info.livemode!==true});
  }
  if(action==="onboard_driver"){
    await requireApprovedDriver(user);
    let account=await mappingFor(user.id);
    if(!account){
      const created=await stripe("accounts","POST",{
        type:"express",
        country:"FR",
        "capabilities[card_payments][requested]":"true",
        "capabilities[transfers][requested]":"true",
        "metadata[samgo_utilisateur_test]":user.id,
        "business_profile[product_description]":"SAMGO : chauffeur indépendant, parcours fictif de test."
      },"samgo_driver_sandbox_v1_"+user.id);
      if(!created.id || !/^acct_[A-Za-z0-9]+$/.test(created.id))
        throw new Error("Création du compte de test Stripe non confirmée.");
      account=created.id;
      await apiCall("samgo_stripe_chauffeurs_test","POST",serviceKey,serviceKey,
        {utilisateur_id:user.id,stripe_compte_id:account},
        {"Prefer":"resolution=merge-duplicates,return=minimal"});
    }
    const link=await stripe("account_links","POST",{
      account, type:"account_onboarding",
      refresh_url:SITE+"?stripe_test_onboarding=retry",
      return_url:SITE+"?stripe_test_onboarding=return"
    });
    if(typeof link.url!=="string" || !link.url.startsWith("https://connect.stripe.com/"))
      throw new Error("Lien Stripe d'inscription non sécurisé.");
    return output({url:link.url,sandbox:true});
  }
  if(action==="checkout"){
    const choiceId=checkedUuid(body?.choix_id);
    const chosen=await apiCall("choix_chauffeur_test?"+qs({
      select:"id,client_id,chauffeur_id,annonce_id,statut",id:"eq."+choiceId,
      client_id:"eq."+user.id,limit:"1"
    }).toString(),"GET",user.token,anonKey);
    const choice=Array.isArray(chosen)?chosen[0]:null;
    if(!choice || choice.statut!=="choisi_test")
      throw new Error("Sélectionnez d'abord un chauffeur pour une simulation en cours.");
    const [ad]=await apiCall("annonces_raccompagnement_test?"+qs({
      select:"distance_km",id:"eq."+choice.annonce_id,client_id:"eq."+user.id,limit:"1"
    }).toString(),"GET",user.token,anonKey);
    if(!ad)throw new Error("Annonce de test non retrouvée.");
    // STRICTEMENT sandbox : les distances sont fictives et choisies par le client.
    // Les paiements réels doivent partir d'une distance et d'un tarif vérifiés côté serveur.
    const distance=Number(ad.distance_km);
    if(!Number.isInteger(distance)||distance<5||distance>20)
      throw new Error("La distance fictive doit être entre 5 et 20 km.");
    const amount=distance*100;
    const destination=await mappingFor(choice.chauffeur_id);
    if(!destination)throw new Error("Le chauffeur n'a pas encore ouvert son compte Stripe de test.");
    const connected=await accountInfo(destination);
    if(!connected.charges_enabled || !connected.payouts_enabled || connected.livemode===true)
      throw new Error("Le compte chauffeur Stripe de test doit finir son inscription.");
    const old=await adminGet("samgo_stripe_paiements_test",{
      select:"stripe_session_id,statut,checkout_url",choix_id:"eq."+choiceId,limit:"1"
    });
    if(old.length) {
      if(old[0].statut==="paye_test")throw new Error("Cette simulation a déjà été payée en sandbox.");
      if(old[0].statut==="checkout_ouvert"&&old[0].checkout_url)
        return output({sandbox:true,url:old[0].checkout_url,existing:true});
      throw new Error("Une session Stripe a déjà existé pour ce test. Créez une nouvelle simulation.");
    }
    // destination charge : 100 % du prix transféré, 0 % de commission plateforme.
    // Les frais Stripe sont supportés par la plateforme dans ce flux.
    const session=await stripe("checkout/sessions","POST",{
      mode:"payment",
      "payment_method_types[0]":"card",
      "success_url":SITE+"?stripe_test_checkout=success",
      "cancel_url":SITE+"?stripe_test_checkout=cancel",
      client_reference_id:choiceId,
      "metadata[choix_id]":choiceId,
      "metadata[client_id]":user.id,
      "metadata[chauffeur_id]":choice.chauffeur_id,
      "payment_intent_data[metadata][choix_id]":choiceId,
      "payment_intent_data[transfer_data][destination]":destination,
      "payment_intent_data[transfer_data][amount]":String(amount),
      "line_items[0][price_data][currency]":"eur",
      "line_items[0][price_data][unit_amount]":String(amount),
      "line_items[0][price_data][product_data][name]":"SAMGO — simulation de trajet (AUCUNE VRAIE COURSE)",
      "line_items[0][quantity]":"1"
    },"samgo_demo_checkout_v1_"+choiceId);
    if(typeof session.url!=="string" || !session.url.startsWith("https://checkout.stripe.com/") ||
       typeof session.id!=="string" || !session.id.startsWith("cs_test_"))
      throw new Error("Stripe n'a pas confirmé de session de paiement sandbox.");
    await apiCall("samgo_stripe_paiements_test","POST",serviceKey,serviceKey,{
      choix_id:choiceId,client_id:user.id,chauffeur_id:choice.chauffeur_id,
      stripe_session_id:session.id,checkout_url:session.url,montant_centimes:amount,
      commission_centimes:0,statut:"checkout_ouvert"
    },{"Prefer":"return=minimal"});
    return output({sandbox:true,url:session.url,commission_percent:0});
  }
  return output({error:"Action inconnue."},400);
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return output({error:"Utilisez POST."},405);
  const origin=req.headers.get("origin");
  if(origin && origin!==FRONT)return output({error:"Origine non autorisée."},403);
  try {
    const user=await readUser(req);
    const payload=await req.json().catch(()=>null);
    if(!payload || typeof payload.action!=="string")return output({error:"Action requise."},400);
    return await handle(payload.action,payload,user);
  }catch(e){
    const message=e instanceof Error?e.message:"Erreur de connexion Stripe sandbox.";
    const code=/Connexion|reconnect|expirée|Utilisateur non reconnu/.test(message)?401:400;
    return output({error:message},code);
  }
});
