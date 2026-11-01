/* SAMGO TEST : diagnostic GPS local, sans compte, sans publication ni stockage.
 * La localisation est demandée uniquement au clic. Aucune coordonnée précise
 * n'est affichée, conservée, journalisée ou transmise sur le réseau.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 let pending=false;
 function describeError(error){
  const code=Number(error?.code);
  const message=String(error?.message||'').toLowerCase();
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent||'');
  if(code===1||/denied|permission|refus|autorisation|not authorized|not authorised/.test(message)){
   return 'Localisation refusée. '+(ios?
    'Sur iPhone, ouvrez Réglages > Confidentialité et sécurité > Service de localisation, puis autorisez Safari ou SAMGO. Vérifiez aussi les réglages de localisation du site dans Safari.':
    'Autorisez la position pour ce site dans les réglages du navigateur ou de votre téléphone.')+
    ' Revenez ensuite tester le GPS.';
  }
  if(code===3||/timeout|timed out|délai|expired/.test(message))
   return 'Le GPS a mis trop longtemps à répondre. Activez la localisation et réessayez, si possible près d’une fenêtre.';
  if(code===2||/unavailable|introuvable|indisponible|no location/.test(message))
   return 'Position introuvable. Vérifiez que le GPS du téléphone est activé et réessayez.';
  return 'Impossible de lire la position sur cet appareil. Vérifiez les autorisations GPS puis réessayez.';
 }
 function getPosition(){
  // Application iOS/Android compilée : module Capacitor, jamais de suivi continu.
  if(window.Capacitor?.isNativePlatform?.()===true){
   const nativeGps=window.Capacitor.Plugins?.Geolocation;
   if(!nativeGps?.getCurrentPosition)
    return Promise.reject(new Error('Module GPS natif indisponible.'));
   return nativeGps.getCurrentPosition({enableHighAccuracy:false,maximumAge:0,timeout:15000});
  }
  if(!window.isSecureContext)
   return Promise.reject(new Error('Le GPS du navigateur exige une connexion HTTPS.'));
  if(!navigator.geolocation?.getCurrentPosition)
   return Promise.reject(new Error('Ce navigateur ne propose pas de GPS.'));
  return new Promise((resolve,reject)=>{
   navigator.geolocation.getCurrentPosition(resolve,reject,{
    enableHighAccuracy:false,maximumAge:0,timeout:15000
   });
  });
 }
 async function run(){
  if(pending)return;
  const button=$('sgGpsLocalRun'),status=$('sgGpsLocalStatus');
  if(!button||!status)return;
  pending=true;
  button.disabled=true;
  status.textContent='Demande de localisation… Autorisez la position sur votre téléphone si une fenêtre apparaît.';
  try{
   const position=await getPosition();
   const coords=position?.coords;
   const lat=coords?.latitude,lon=coords?.longitude;
   if(typeof lat!=='number'||typeof lon!=='number'||
      !Number.isFinite(lat)||!Number.isFinite(lon)||
      Math.abs(lat)>90||Math.abs(lon)>180)
    throw new Error('Position GPS invalide.');
   const accuracy=Number(coords?.accuracy);
   const accuracyLabel=Number.isFinite(accuracy)&&accuracy>0?
    ' Précision estimée : environ ±'+Math.round(accuracy)+' m.':' Précision non indiquée par le téléphone.';
   const hint=Number.isFinite(accuracy)&&accuracy>5000?
    ' La position est trop approximative pour afficher des demandes proches : activez la localisation précise.':'';
   status.textContent='✓ GPS détecté sur cet appareil.'+accuracyLabel+hint+
    ' Test local réussi. Aucune coordonnée n’a été envoyée à SAMGO. Pour voir des annonces proches, un compte chauffeur approuvé reste nécessaire.';
  }catch(error){
   if(error?.message==='Le GPS du navigateur exige une connexion HTTPS.'||
      error?.message==='Ce navigateur ne propose pas de GPS.'||
      error?.message==='Module GPS natif indisponible.')
    status.textContent=error.message+' Le test de localisation n’a pas démarré.';
   else status.textContent=describeError(error);
  }finally{
   pending=false;
   button.disabled=false;
  }
 }
 window.sgGpsLocalTest={run};
})();
