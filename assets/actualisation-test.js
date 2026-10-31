/* SAMGO – Rafraîchissement de démonstration, uniquement quand la page est visible.
   Ne sollicite jamais le GPS, n’envoie aucune notification push et ne démarre aucune course. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const INTERVAL_MS=45000;
 let inFlight=false, lastRun=0, sequence=0, pendingForced=false;
 function route(){
  if(document.body.classList.contains('sg-route-trips'))return 'client';
  if(document.body.classList.contains('sg-route-driver')){
   const active=document.querySelector('[data-dpane="missions"]:not(.hidden),[data-dpane="profil"]:not(.hidden)');
   return active?'driver':null;
  }
  return null;
 }
 function signed(){
  return typeof sessionUser!=='undefined'&&!!sessionUser&&typeof client!=='undefined'&&!!client;
 }
 function setDisplay(msg){
  for(const id of ['sgRefreshClientInfo','sgRefreshDriverInfo']){
   const elem=$(id);if(elem)elem.textContent=msg;
  }
 }
 function localTime(){
  return new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date());
 }
 async function refresh(force){
  const target=route();
  if(!target||document.visibilityState==='hidden'||!signed())return;
  // Une demande manuelle (ou un retour au premier plan) ne doit pas être perdue
  // pendant une lecture réseau lente lancée par l'ancien compte/écran.
  if(inFlight){if(force)pendingForced=true;return;}
  // Ne jamais remplacer le formulaire pendant la saisie d'un avis client.
  const focused=document.activeElement;
  if(target==='client'&&focused&&typeof focused.closest==='function'){
   const form=focused.closest('.sg-review-demo-card');
   if(form&&form.querySelector('.sg-review-comment'))return;
  }
  if(!force&&Date.now()-lastRun<INTERVAL_MS-1000)return;
  if(navigator.onLine===false){setDisplay('Hors connexion — affichage potentiellement ancien.');return;}
  inFlight=true;lastRun=Date.now();
  const my=++sequence,uid=sessionUser.id;
  const stillCurrent=()=>my===sequence&&signed()&&sessionUser.id===uid&&
   route()===target&&document.visibilityState!=='hidden';
  setDisplay('Actualisation des tests en cours…');
  try{
   if(target==='client'){
    // sgDemand.refreshClient est déjà complété par sgReviews à l'initialisation.
    // Ne pas déclencher deux fois les mêmes lectures de suivi / avis à chaque cycle.
    if(window.sgDemand&&typeof window.sgDemand.refreshClient==='function')await window.sgDemand.refreshClient();
    if(!stillCurrent())return;
    if(window.sgLoyaltyTest&&typeof window.sgLoyaltyTest.refresh==='function')await window.sgLoyaltyTest.refresh();
    if(!stillCurrent())return;
    if(window.sgChatTest&&typeof window.sgChatTest.refresh==='function')await window.sgChatTest.refresh('client');
    if(!stillCurrent())return;
   }else{
    if(window.sgReviews&&typeof window.sgReviews.refreshDriver==='function')await window.sgReviews.refreshDriver();
    if(!stillCurrent())return;
    if(window.sgChatTest&&typeof window.sgChatTest.refresh==='function')await window.sgChatTest.refresh('driver');
    if(!stillCurrent())return;
    if(document.querySelector('[data-dpane="missions"]:not(.hidden)')&&window.sgDemand&&typeof window.sgDemand.refresh==='function')await window.sgDemand.refresh();
    if(!stillCurrent())return;
   }
   if(!stillCurrent())return;
   const clientErrors=['sgMyAdsStatus','sgReviewClientStatus','sgLoyaltyStatus','sgChatClientStatus'];
   const driverErrors=['sgDriverReviewsStatus','sgDriverSelectionsStatus','sgChatDriverStatus'];
   // Ne pas afficher « synchronisé » si un sous-module a signalé un échec
   // sans lever d'exception à l'appelant.
   const ids=target==='client'?clientErrors:driverErrors;
   const failed=ids.some(id=>/impossible|erreur|indisponible|échec|refus|connexion instable/i.test($(id)?.textContent||''));
   if(failed)setDisplay('Certaines données de TEST n’ont pas été actualisées. Réessayez avec ↻.');
   else setDisplay('Tests synchronisés à '+localTime()+' · Rafraîchissement automatique toutes les 45 s.');
  }catch(_){
   if(stillCurrent())setDisplay('Connexion instable : actualisation impossible, réessayez.');
  }finally{
   inFlight=false;
   if(pendingForced){
    pendingForced=false;
    Promise.resolve().then(()=>refresh(true));
   }
  }
 }
 setInterval(()=>refresh(false),INTERVAL_MS);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh(true);});
 window.addEventListener('online',()=>refresh(true));
 window.addEventListener('offline',()=>setDisplay('Hors connexion — les nouvelles demandes ne sont pas disponibles.'));
 // Premier rafraîchissement des parcours affichés après le chargement, sans action automatique sensible.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(true));
 else refresh(true);
 window.sgRefreshTests={refresh:()=>refresh(true)};
})();