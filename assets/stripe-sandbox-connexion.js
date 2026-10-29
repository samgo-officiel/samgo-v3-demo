/* SAMGO — Connexion Stripe Connect en environnement TEST uniquement.
 * Ne collecter ni coordonnées bancaires ni données d'identité dans ce site.
 * Les actions financières ne sont possibles que via des clics explicites et un
 * serveur Supabase vérifiant l'utilisateur et les secrets TEST côté serveur.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ENDPOINT='https://tgwdycgwgfisuskxwkvk.supabase.co/functions/v1/samgo-stripe-sandbox';
let lastStatus=null,checking=false,revision=0;
// Un seul démarrage Checkout à la fois : bloque les doubles clics pendant l'appel réseau.
let checkoutPending=null;
function connected(){
 return typeof sessionUser!=='undefined'&&!!sessionUser&&typeof client!=='undefined'&&!!client
   &&client.auth&&typeof client.auth.getAccessToken==='function';
}
function sameUser(uid){return connected()&&sessionUser.id===uid;}
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
 const userId=connected()?sessionUser.id:null,my=++revision;
 if(!connected()){
  lastStatus=null;shared('Connectez-vous pour consulter la connexion Stripe de test.');
  checking=false;return;
 }
 try{
  const data=await call('status');
  if(my!==revision||!sameUser(userId))return;
  lastStatus=data;
  if(!data.configured)shared('Stripe TEST : la connexion du compte est confirmée, mais la clé Stripe de test et son activation côté Supabase restent à configurer. Aucun paiement possible.');
  else {
   message('sgStripeSandboxClientStatus','Stripe SANDBOX prêt pour les essais, sous réserve du compte chauffeur. Aucun paiement réel.');
   message('sgStripeSandboxDriverStatus','Stripe SANDBOX disponible. Le chauffeur doit terminer son inscription Stripe Connect de test avant un paiement fictif.');
   if(typeof driverSimAllowed!=='undefined'&&driverSimAllowed)await refreshDriver();
  }
 }catch(e){
  if(my===revision&&(userId===null||sameUser(userId)))
    shared('État Stripe indisponible : '+(e.message||'réessayez.'));
 }
 finally{if(my===revision)checking=false;}
}
async function refreshDriver(){
 if(!connected()||typeof driverSimAllowed==='undefined'||!driverSimAllowed)return;
 const userId=sessionUser.id,my=revision;
 try{
  const data=await call('driver_status');
  if(my!==revision||!sameUser(userId))return;
  const linked=data.linked===true;
  const ready=linked && data.ready_for_test===true;
  const correction=linked && data.verification_state==='correction_required';
  const reviewing=linked && data.verification_state==='processing';
  const badge=!linked?'💳 STRIPE CONNECT — NON LIÉ (TEST)':
   ready?'💳 STRIPE CONNECT — COMPTE TEST ACTIF':
   correction?'💳 STRIPE CONNECT — DONNÉES DE TEST À CORRIGER':
   reviewing?'💳 STRIPE CONNECT — VÉRIFICATION TEST EN COURS':
   '💳 STRIPE CONNECT — INSCRIPTION TEST INCOMPLÈTE';
  message('sgStripeConnectBadge',badge);
  const button=$('sgStripeSandboxDriverButton');
  if(button)button.textContent=!linked?'Configurer mon compte chauffeur Stripe TEST':
   ready?'Consulter mon compte chauffeur Stripe TEST':
   correction?'Corriger mon compte chauffeur Stripe TEST':
   'Reprendre mon inscription chauffeur Stripe TEST';
  const status=!linked?'Aucun compte chauffeur Stripe de test encore associé.':
   ready?'Compte chauffeur de TEST validé pour la simulation. Aucun virement réel actif.':
   correction?'Stripe a refusé la vérification des informations fictives du chauffeur'+
     (data.identity_test_rejected?' (identité de test non reconnue).':'')+
     ' Utilisez le bouton ci-dessus pour corriger les données TEST. Ne renseignez pas de vraie pièce d’identité pour cette simulation.':
   reviewing?'Inscription du chauffeur de TEST soumise ; Stripe vérifie encore les données fictives.':
   'Inscription Stripe de TEST incomplète. Utilisez le bouton ci-dessus pour reprendre les étapes.';
  message('sgStripeSandboxDriverStatus',status);
 }catch(e){
  if(my===revision&&sameUser(userId)){
   message('sgStripeConnectBadge','💳 STRIPE CONNECT — STATUT TEST INDISPONIBLE');
   message('sgStripeSandboxDriverStatus','Statut chauffeur Stripe : '+(e.message||'réessayez.'));
  }
 }
}
async function onboardDriver(){
 const userId=connected()?sessionUser.id:null,my=revision;
 const btn=$('sgStripeSandboxDriverButton');
 if(btn)btn.disabled=true;
 message('sgStripeSandboxDriverStatus','Préparation de l’inscription chauffeur Stripe Connect en TEST…');
 try{
  if(typeof driverSimAllowed==='undefined'||!driverSimAllowed)
   throw new Error('Votre compte chauffeur doit d’abord être approuvé dans SAMGO en démo.');
  const data=await call('onboard_driver');
  if(my!==revision||!sameUser(userId))return;
  if(!data.sandbox||typeof data.url!=='string'||!data.url.startsWith('https://connect.stripe.com/'))
   throw new Error('Lien Stripe sécurisé non reçu.');
  if(!window.sgNativeOpenExternal?.(data.url))window.location.assign(data.url);
 }catch(e){
  if(my===revision&&(userId===null||sameUser(userId)))
   message('sgStripeSandboxDriverStatus','Impossible de démarrer : '+(e.message||'réessayez.'));
 }finally{if(btn)btn.disabled=false;}
}
async function checkout(choiceId){
 const userId=connected()?sessionUser.id:null,my=revision;
 const id=String(choiceId||'');
 if(!/^[a-f0-9-]{36}$/i.test(id)){message('sgStripeSandboxClientStatus','Réservation de test invalide.');return;}
 if(checkoutPending){
  message('sgStripeSandboxClientStatus','Un QR Stripe TEST est déjà en préparation. Évitez les doubles clics.');
  return;
 }
 if(!window.confirm('Créer un QR code Stripe en environnement TEST pour une course fictive ? Aucun paiement réel.'))return;
 const operation={uid:userId,choice:id};
 checkoutPending=operation;
 message('sgStripeSandboxClientStatus','Vérification du chauffeur et préparation du paiement Stripe TEST…');
 try{
  const data=await call('checkout',{choix_id:id});
  if(my!==revision||!sameUser(userId))return;
  if(!data.sandbox||typeof data.url!=='string'||!data.url.startsWith('https://checkout.stripe.com/'))
   throw new Error('Lien de paiement Stripe de test non vérifié.');
  if(!window.sgStripeQrTest || typeof window.sgStripeQrTest.show!=='function')
   throw new Error('QR code Stripe TEST non chargé. Actualisez la page.');
  window.sgStripeQrTest.show(data.url);
  message('sgStripeSandboxClientStatus','QR code Stripe TEST prêt. Scannez avec un deuxième téléphone ou ouvrez Stripe TEST sur cet appareil.');
 }catch(e){
  if(my===revision&&(userId===null||sameUser(userId)))
   message('sgStripeSandboxClientStatus','Paiement de test indisponible : '+(e.message||'réessayez.'));
 }finally{
  if(checkoutPending===operation)checkoutPending=null;
 }
}
function showReturnStatus(){
 const banner=$('sgStripeReturnStatus');
 if(!banner)return;
 const query=new URLSearchParams(window.location.search||'');
 const checkout=query.get('stripe_test_checkout');
 const onboard=query.get('stripe_test_onboarding');
 if(checkout==='success'){
  banner.textContent='💳 Retour depuis Stripe SANDBOX. Ce retour ne prouve pas le paiement : seul l’événement Stripe signé pourra le confirmer. Consultez « Mes courses » et actualisez le statut.';
  banner.hidden=false;
 }else if(checkout==='cancel'){
  banner.textContent='💳 Session Stripe de test annulée. Aucun paiement confirmé. Vous pouvez réessayer depuis « Mes courses ».';
  banner.hidden=false;
 }else if(onboard==='return'||onboard==='retry'){
  banner.textContent='💳 Retour depuis Stripe Connect en mode TEST. L’inscription chauffeur doit être vérifiée dans « Mes gains » ; le retour seul ne prouve pas sa validation.';
  banner.hidden=false;
 }
}
function reset(){
 if(window.sgStripeQrTest)window.sgStripeQrTest.close();
 // Sur déconnexion ou changement d'utilisateur : aucun statut de l'ancien
 // compte ni lien Stripe tardif ne doit s'afficher / ouvrir une page.
 revision++;checking=false;lastStatus=null;checkoutPending=null;
 message('sgStripeConnectBadge','💳 STRIPE CONNECT — STATUT TEST À VÉRIFIER');
 shared('Connectez-vous pour consulter le statut Stripe TEST.');
 const btn=$('sgStripeSandboxDriverButton');
 if(btn){
  btn.disabled=false;
  btn.textContent='Configurer mon compte chauffeur Stripe TEST';
 }
}
showReturnStatus();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(),{once:true});
else refresh();
window.sgStripeSandbox={refresh,refreshDriver,onboardDriver,checkout,reset};
})();