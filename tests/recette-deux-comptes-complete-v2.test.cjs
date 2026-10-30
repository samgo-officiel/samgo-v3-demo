'use strict';
// Recette automatique sans utilisateurs réels ni API extérieure : deux sessions
// isolées, avec les mêmes appels HTTP que le site SAMGO en mode TEST.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).find(s=>s.includes('window.samgoCreateClient'));
assert.ok(source,'Le vrai client HTTP SAMGO doit être présent');
const uuid=n=>('00000000-0000-4000-8000-'+String(n).padStart(12,'0'));
const clientId=uuid(1),driverId=uuid(2),otherId=uuid(3),adId=uuid(10),replyId=uuid(11),choiceId=uuid(12);
const response=(status,data)=>({
 ok:status>=200&&status<300,status,
 text:async()=>data==null?'':JSON.stringify(data)
});
function fixture(){
 const db={ads:[],replies:[],choices:[],messages:[],calls:[]};
 const credentials={client:clientId,driver:driverId,other:otherId};
 const approved=new Set([driverId]);
 let messageCounter=20;
 function identify(options){
  const token=String(options.headers?.Authorization||'').replace('Bearer ','');
  return token.startsWith('token-')?token.slice(6):null;
 }
 function handler(url,options={}){
  const u=new URL(url),method=options.method||'GET';
  const path=u.pathname,body=options.body?JSON.parse(options.body):null;
  if(path==='/auth/v1/token'){
   const id=credentials[body.email?.split('@')[0]];
   return id?response(200,{
    access_token:'token-'+id,refresh_token:'refresh-'+id,expires_in:3600,user:{id}
   }):response(400,{message:'invalid login credentials'});
  }
  const who=identify(options);
  if(!who)return response(401,{message:'Non authentifié'});
  db.calls.push({who,method,path});
  if(path==='/rest/v1/annonces_raccompagnement_test'){
   if(method==='POST'){
    if(body.client_id!==who)return response(403,{message:'Annonce interdite'});
    db.ads.push({...body,id:adId,statut:'test_en_attente',
     tarif_indicatif:10,expire_le:new Date(Date.now()+3600000).toISOString()});
    return response(201,null);
   }
   if(method==='GET'){
    const owner=u.searchParams.get('client_id')?.replace('eq.','');
    const visible=db.ads.filter(a=>approved.has(who)||a.client_id===who);
    return response(200,owner?visible.filter(a=>a.client_id===owner):visible);
   }
  }
  if(path==='/rest/v1/reponses_annonces_test'){
   if(method==='POST'){
    const ad=db.ads.find(a=>a.id===body.annonce_id);
    if(!ad||!approved.has(who)||ad.client_id===who||body.chauffeur_id!==who)
     return response(403,{message:'Réponse interdite'});
    db.replies.push({...body,id:replyId});
    return response(201,null);
   }
   return response(200,db.replies.filter(r=>{
    const ad=db.ads.find(a=>a.id===r.annonce_id);
    return r.chauffeur_id===who||ad?.client_id===who;
   }));
  }
  if(path==='/rest/v1/choix_chauffeur_test'){
   if(method==='POST'){
    const ad=db.ads.find(a=>a.id===body.annonce_id);
    const interest=db.replies.find(r=>r.id===body.reponse_id&&r.chauffeur_id===body.chauffeur_id);
    if(!ad||!interest||ad.client_id!==who||body.client_id!==who)
     return response(403,{message:'Choix interdit'});
    db.choices.push({...body,id:choiceId});
    return response(201,null);
   }
   if(method==='PATCH'){
    const c=db.choices.find(c=>c.id===u.searchParams.get('id')?.replace('eq.','')&&c.client_id===who);
    if(!c||c.statut!=='choisi_test')return response(200,[]);
    Object.assign(c,body);
    return response(200,[c]);
   }
   return response(200,db.choices.filter(c=>c.client_id===who||c.chauffeur_id===who));
  }
  if(path==='/rest/v1/messages_course_test'){
   const c=db.choices.find(c=>c.id===(method==='GET'?u.searchParams.get('choix_id')?.replace('eq.',''):body.choix_id));
   if(!c||![c.client_id,c.chauffeur_id].includes(who))
    return response(403,{message:'Conversation privée'});
   if(method==='POST'){
    if(c.statut!=='choisi_test'||body.auteur_id!==who)
     return response(403,{message:'Conversation terminée'});
    db.messages.push({...body,id:uuid(messageCounter++),cree_le:new Date().toISOString()});
    return response(201,null);
   }
   return response(200,db.messages.filter(m=>m.choix_id===c.id).slice().reverse());
  }
  return response(404,{message:'Endpoint TEST inconnu'});
 }
 function actor(){
  const entries=new Map();
  const storage={
   getItem:key=>entries.get(key)||null,
   setItem:(key,val)=>entries.set(key,val),
   removeItem:key=>entries.delete(key)
  };
  const window={location:{hash:'',origin:'https://samgo-officiel.github.io',
   pathname:'/samgo-v3-demo/',search:''},history:{replaceState(){}}};
  vm.runInNewContext(source,{window,fetch:handler,sessionStorage:storage,
   URL,URLSearchParams,Date,Promise,AbortSignal},
   {filename:'samgo-client-http'});
  return window.samgoCreateClient('https://fake.supabase.co','sb_publishable_test');
 }
 return {db,actor};
}
test('V2 : une annonce passe du vrai client HTTP au chauffeur, puis au chat, sans argent réel',async()=>{
 const f=fixture(),client=f.actor(),driver=f.actor(),other=f.actor();
 for(const [api,email] of [[client,'client@test.invalid'],[driver,'driver@test.invalid'],[other,'other@test.invalid']]){
  const signed=await api.auth.signInWithPassword({email,password:'test-password'});
  assert.equal(signed.error,null);
 }
 const created=await client.testRequests.create({client_id:clientId,
  depart_test:'Centre TEST',destination_test:'Gare TEST',latitude_approx:45.1,
  longitude_approx:1.8,distance_km:10});
 assert.equal(created.error,null);
 assert.equal(f.db.ads.length,1);
 assert.equal((await client.testRequests.mine(clientId)).data.length,1);
 const nearby=await driver.testRequests.list({lat:45.1,lng:1.8},30);
 assert.equal(nearby.error,null);
 assert.equal(nearby.data[0].id,adId);
 const interested=await driver.testReplies.create(adId,driverId);
 assert.equal(interested.error,null);
 assert.equal((await client.testReplies.list()).data.length,1);
 const choice=await client.testChoices.choose(adId,replyId,driverId,clientId);
 assert.equal(choice.error,null);
 assert.equal((await driver.testChoices.list()).data[0].chauffeur_id,driverId);
 const first=await client.testMessages.create(choiceId,clientId,'Bonjour chauffeur TEST');
 assert.equal(first.error,null);
 const second=await driver.testMessages.create(choiceId,driverId,'J’arrive (simulation)');
 assert.equal(second.error,null);
 assert.equal((await client.testMessages.list(choiceId)).data.length,2);
 assert.equal((await driver.testMessages.list(choiceId)).data.length,2);
 assert.ok((await other.testMessages.list(choiceId)).error,'Un tiers ne lit pas une conversation');
 const finished=await client.testChoices.finish(choiceId,clientId);
 assert.equal(finished.error,null);
 const late=await driver.testMessages.create(choiceId,driverId,'Message après fin');
 assert.ok(late.error,'Une conversation terminée reste en lecture seule');
 assert.equal(f.db.messages.length,2);
 // Aucune route Stripe, donnée de carte, vrai GPS ou commande de paiement n'est utilisée.
 assert.equal(f.db.calls.some(c=>/stripe|payment|checkout|charge/.test(c.path)),false);
});
test('V2 : un chauffeur ne peut répondre à sa propre annonce',async()=>{
 const f=fixture(),driver=f.actor();
 assert.equal((await driver.auth.signInWithPassword({email:'driver@test.invalid',password:'test'})).error,null);
 assert.equal((await driver.testRequests.create({client_id:driverId,
  depart_test:'Maison TEST',destination_test:'Gare TEST',latitude_approx:45,
  longitude_approx:2,distance_km:5})).error,null);
 const result=await driver.testReplies.create(adId,driverId);
 assert.ok(result.error);
 assert.equal(f.db.replies.length,0);
});