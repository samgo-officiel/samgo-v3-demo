/* SAMGO – Rafraîchissement de démonstration, uniquement quand la page est visible.
   Ne sollicite jamais le GPS, n’envoie aucune notification push et ne démarre aucune course. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const INTERVAL_MS=45000;
 let inFlight=false, lastRun=0, sequence=0;
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
  if(inFlight)return;
  if(!force&&Date.now()-lastRun<INTERVAL_MS-1000)return;
  if(navigator.onLine===false){setDisplay('Hors connexion — affichage potentiellement ancien.');return;}
  inFlight=true;lastRun=Date.now();
  const my=++sequence;setDisplay('Actualisation des tests en cours…');
  try{
   if(target==='client'){
    if(window.sgDemand&&typeof window.sgDemand.refreshClient==='function')await window.sgDemand.refreshClient();
   }else{
    if(window.sgReviews&&typeof window.sgReviews.refreshDriver==='function')await window.sgReviews.refreshDriver();
    if(document.querySelector('[data-dpane="missions"]:not(.hidden)')&&window.sgDemand&&typeof window.sgDemand.refresh==='function')await window.sgDemand.refresh();
   }
   if(my!==sequence)return;
   const clientError=$('sgReviewClientStatus')?.textContent||'';
   const driverError=$('sgDriverReviewsStatus')?.textContent||'';
   if((target==='client'&&/impossible|erreur|indisponible/i.test(clientError))||(target==='driver'&&/impossible|erreur|indisponible/i.test(driverError))){
    setDisplay('Certaines données ne se chargent pas. Réessayez avec ↻.');
   }else setDisplay('Tests synchronisés à '+localTime()+' · Rafraîchissement automatique toutes les 45 s.');
  }catch(_){
   if(my===sequence)setDisplay('Connexion instable : actualisation impossible, réessayez.');
  }finally{inFlight=false;}
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