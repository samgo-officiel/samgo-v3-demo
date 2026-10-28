/* SAMGO — Connexion Stripe Connect en environnement TEST uniquement.
 * Ne collecter ni coordonnées bancaires ni données d'identité dans ce site.
 * Les actions financières ne sont possibles que via des clics explicites et un
 * serveur Supabase vérifiant l'utilisateur et les secrets TEST côté serveur.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ENDPOINT='https://tgwdycgwgfisuskxwkvk.supabase.co/functions/v1/samgo-stripe-sandbox';
let lastStatus=null,checking=false;
function connected(){
 return typeof sessionUser!=='undefined'&&!!sessionUser&&typeof client!=='undefined'&&!!client
   &&client.auth&&typeof client.auth.getAccessToken==='function';
}
function message(id,value){const node=$(id);if(node)node.textContent=value;}
function shared(text){
 message('sgStripeSandboxClientStatus',text);
 message('sgStripeSandboxDriverStatus',text);
}
async function call(action,extra={}){
 if(!connected())throw new Error('Connectez-vous à SAMGO avant de continuer.');
 const token=await client.auth.getAccessToken();
 if(!token)throw new Error('Votre session a expiré. Reconnectez-vous.');
 let response;
 try{
  response=await fetch(ENDPOINT,{
   method:'POST',
   headers:{'Content-Type':'application/json','apikey':PUBLISHABLE_KEY,'Authorization':'Bearer '+token},
   body:JSON.stringify({action,...extra}),
   cache:'no-store'
  });
 }catch(_){throw new Error('Impossible de joindre le serveur de test. Vérifiez Internet.');}
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||'Le serveur Stripe de test est indisponible.');
 return body;
}
async function refresh(){
 if(checking)return;
 checking=true;
 if(!connected()){
  lastStatus=null;shared('Connectez-vous pour consulter la connexion Stripe de test.');
  checking=false;return;
 }
 try{
  const data=await call('status');
  lastStatus=data;
  if(!data.configured)shared('Stripe TEST : la connexion du compte est confirmée, mais la clé Stripe de test et son activation côté Supabase restent à configurer. Aucun paiement possible.');
  else {
   message('sgStripeSandboxClientStatus','Stripe SANDBOX prêt pour les essais, sous réserve du compte chauffeur. Aucun paiement réel.');
   message('sgStripeSandboxDriverStatus','Stripe SANDBOX disponible. Le chauffeur doit terminer son inscription Stripe Connect de test avant un paiement fictif.');
   if(typeof driverSimAllowed!=='undefined'&&driverSimAllowed)await refreshDriver();
  }
 }catch(e){shared('État Stripe indisponible : '+(e.message||'réessayez.'));}
 finally{checking=false;}
}
async function refreshDriver(){
 if(!connected()||typeof driverSimAllowed==='undefined'||!driverSimAllowed)return;
 try{
  const data=await call('driver_status');
  message('sgStripeSandboxDriverStatus',
   !data.linked?'Aucun compte chauffeur Stripe de test encore associé. Vous pouvez commencer l’inscription ci-dessous.':
   data.ready_for_test?'Compte chauffeur de test actif. Les paiements restent simulés.':
   'Compte Stripe de test créé ; terminez sa vérification dans Stripe Connect.');
 }catch(e){message('sgStripeSandboxDriverStatus','Statut chauffeur Stripe : '+(e.message||'réessayez.'));}
}
async function onboardDriver(){
 const btn=$('sgStripeSandboxDriverButton');
 if(btn)btn.disabled=true;
 message('sgStripeSandboxDriverStatus','Préparation de l’inscription chauffeur Stripe Connect en TEST…');
 try{
  if(typeof driverSimAllowed==='undefined'||!driverSimAllowed)
   throw new Error('Votre compte chauffeur doit d’abord être approuvé dans SAMGO en démo.');
  const data=await call('onboard_driver');
  if(!data.sandbox||typeof data.url!=='string'||!data.url.startsWith('https://connect.stripe.com/'))
   throw new Error('Lien Stripe sécurisé non reçu.');
  window.location.assign(data.url);
 }catch(e){
  message('sgStripeSandboxDriverStatus','Impossible de démarrer : '+(e.message||'réessayez.'));
 }finally{if(btn)btn.disabled=false;}
}
async function checkout(choiceId){
 const id=String(choiceId||'');
 if(!/^[a-f0-9-]{36}$/i.test(id)){message('sgStripeSandboxClientStatus','Réservation de test invalide.');return;}
 if(!window.confirm('Ouvrir Stripe en environnement TEST pour une course fictive ? Aucun vrai paiement et aucune vraie course.'))return;
 message('sgStripeSandboxClientStatus','Vérification du chauffeur et préparation du paiement Stripe TEST…');
 try{
  const data=await call('checkout',{choix_id:id});
  if(!data.sandbox||typeof data.url!=='string'||!data.url.startsWith('https://checkout.stripe.com/'))
   throw new Error('Lien de paiement Stripe de test non vérifié.');
  window.location.assign(data.url);
 }catch(e){message('sgStripeSandboxClientStatus','Paiement de test indisponible : '+(e.message||'réessayez.'));}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(),{once:true});
else refresh();
window.sgStripeSandbox={refresh,refreshDriver,onboardDriver,checkout};
})();