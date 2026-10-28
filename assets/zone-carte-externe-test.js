/* SAMGO TEST : ouverture volontaire d'une zone approximative dans Google Maps.
 * Les coordonnées de l'annonce sont déjà arrondies pour la démo ;
 * aucune position GPS précise du chauffeur n'est incluse dans l'URL.
 * Aucun trajet ni estimation ne sont calculés par SAMGO.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 function mapsUrl(lat,lng){
  const a=Number(lat),b=Number(lng);
  if(lat==null||lng==null||!Number.isFinite(a)||!Number.isFinite(b)||
     a < -90||a > 90||b < -180||b > 180) return null;
  const roundedA=Math.round(a*100)/100,roundedB=Math.round(b*100)/100;
  const query=encodeURIComponent(roundedA.toFixed(2)+','+roundedB.toFixed(2));
  return 'https://www.google.com/maps/search/?api=1&query='+query;
 }
 function open(lat,lng){
  const url=mapsUrl(lat,lng);
  const status=$('sgNearbyStatus');
  if(!url){
   if(status)status.textContent='Zone GPS fictive invalide, impossible d’ouvrir la carte.';
   return false;
  }
  try{
   if(window.sgNativeOpenExternal?.(url))return true;
   const external=window.open(url,'_blank','noopener,noreferrer');
   if(!external && status)status.textContent='Ouverture de la carte bloquée. Vérifiez les réglages du navigateur.';
   return !!external;
  }catch(_){
   if(status)status.textContent='Impossible d’ouvrir la carte externe sur cet appareil.';
   return false;
  }
 }
 window.sgMapsZoneTest={open,mapsUrl};
})();
