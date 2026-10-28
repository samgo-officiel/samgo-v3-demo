/* SAMGO TEST — Diagnostic volontaire, purement local au navigateur.
 * N'obtient PAS la position, ne demande AUCUNE permission et n'envoie AUCUNE donnée.
 * Ne consulte jamais les jetons de session, comptes ou documents.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const standalone=()=>(
  window.matchMedia?.('(display-mode: standalone)')?.matches===true ||
  navigator.standalone===true
 );
 function line(label,value){
  const item=document.createElement('li');
  const strong=document.createElement('strong');
  strong.textContent=label+' : ';
  const text=document.createElement('span');
  text.textContent=value;
  item.append(strong,text);
  return item;
 }
 const permissionLabel=value=>({
  granted:'autorisée dans ce navigateur',
  prompt:'pas encore demandée dans ce navigateur',
  denied:'refusée : à modifier dans les réglages du navigateur ou du téléphone'
 })[value]||'non déterminée';
 async function collect(){
  const results=[
   ['Connexion',navigator.onLine===false?'hors ligne':'réseau potentiellement disponible (à confirmer lors des essais)'],
   ['Connexion sécurisée',window.isSecureContext?'HTTPS / contexte sécurisé':'contexte non sécurisé — GPS indisponible'],
   ['Installation',standalone()?'ouverte depuis l’icône de l’application web':'ouverte dans un navigateur'],
   ['GPS du navigateur',navigator.geolocation?'API présente (position non demandée)':'indisponible dans ce navigateur'],
   ['Notifications',typeof Notification==='undefined'?'non prises en charge':(
     Notification.permission==='granted'?'autorisées':Notification.permission==='denied'?'refusées':'pas encore autorisées'
   )],
  ];
  if(navigator.permissions?.query){
   try{
    const permission=await navigator.permissions.query({name:'geolocation'});
    results.push(['Autorisation GPS',permissionLabel(permission?.state)]);
   }catch(_){results.push(['Autorisation GPS','état non accessible (aucune autorisation demandée)']);}
  }else results.push(['Autorisation GPS','état non accessible (aucune autorisation demandée)']);
  if(navigator.serviceWorker?.getRegistration){
   try{
    const registration=await navigator.serviceWorker.getRegistration('./');
    results.push(['Mode hors connexion',registration?.active?'service worker installé':'non vérifié ou pas encore activé']);
   }catch(_){results.push(['Mode hors connexion','état indisponible']);}
  }else results.push(['Mode hors connexion','service worker non pris en charge']);
  return results;
 }
 let generation=0;
 async function run(){
  const root=$('sgDeviceReport');
  if(!root)return;
  const my=++generation;
  root.replaceChildren();
  const msg=document.createElement('p');
  msg.textContent='Vérification locale de cet appareil…';
  root.append(msg);
  const btn=$('sgDeviceRun');if(btn)btn.disabled=true;
  try{
   const rows=await collect();
   if(my!==generation)return;
   const list=document.createElement('ul');
   for(const [label,value] of rows)list.append(line(label,value));
   const note=document.createElement('p');
   note.textContent='Aucune position récupérée ni donnée envoyée. Les véritables essais GPS doivent être lancés séparément dans Chauffeur → Missions.';
   root.replaceChildren(list,note);
  }catch(_){
   if(my===generation)msg.textContent='Diagnostic indisponible sur cet appareil. Vous pouvez utiliser SAMGO TEST normalement.';
  }finally{if(my===generation&&btn)btn.disabled=false;}
 }
 window.sgDeviceCheck={run};
})();
