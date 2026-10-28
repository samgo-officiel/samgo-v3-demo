/* SAMGO TEST : bannière de connexion locale, sans requête réseau ni GPS. */
(function(){
 'use strict';
 const label='Hors connexion : vos messages, annonces et statuts TEST ne peuvent pas être actualisés. Réessayez une fois Internet rétabli.';
 function update(){
  const banner=document.getElementById('sgNetworkOffline');
  if(!banner)return;
  const offline=navigator.onLine===false;
  banner.hidden=!offline;
  if(offline)banner.textContent=label;
 }
 window.addEventListener('online',update);
 window.addEventListener('offline',update);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update,{once:true});
 else update();
 window.sgNetworkStatusTest={update};
})();
