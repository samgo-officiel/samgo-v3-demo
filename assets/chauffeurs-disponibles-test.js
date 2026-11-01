/* SAMGO TEST : afficher uniquement des chauffeurs vérifiés + disponibles
 * que les politiques Supabase RLS rendent consultables.
 * Le GPS est demandé sur clic. Les positions privées ne sont jamais affichées :
 * seules des tranches de distance (vol d'oiseau approximatif) sont rendues.
 * Pas de réservation, pas de suivi, aucune coordonnée exacte envoyée.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let busy=false,requestGeneration=0;
function status(message){const node=$('sgAvailableDriversStatus');if(node)node.textContent=message;}
function distanceKm(a,b,c,d){
 const rad=Math.PI/180;
 const dh=(c-a)*rad,dl=(d-b)*rad;
 const k=Math.sin(dh/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(dl/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(k)));
}
function band(km){
 if(!Number.isFinite(km)||km<0)return 'distance inconnue';
 if(km<=5)return 'à environ 0 à 5 km';
 if(km<=10)return 'à environ 5 à 10 km';
 if(km<=20)return 'à environ 10 à 20 km';
 if(km<=30)return 'à environ 20 à 30 km';
 if(km<=50)return 'à environ 30 à 50 km';
 return 'plus de 50 km';
}
function safeRows(rows,position,now=Date.now()){
 if(!Array.isArray(rows))return [];
 const list=[];
 for(const row of rows.slice(0,100)){
  const p=row?.position;
  const lat=Number(p?.latitude_approx),lng=Number(p?.longitude_approx);
  const when=Date.parse(String(p?.actualise_le||''));
  if(!p||p.latitude_approx===null||p.longitude_approx===null||
   !Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||
   !Number.isFinite(when)||when>now+60000||when<now-30*60*1000)continue;
  const dist=distanceKm(position.lat,position.lng,lat,lng);
  if(dist>50)continue;
  const name=String(row.name||'Chauffeur SAMGO').trim().slice(0,40);
  list.push({name:name||'Chauffeur SAMGO',band:band(dist),sortDistance:dist});
 }
 return list.sort((a,b)=>a.sortDistance-b.sortDistance);
}
function requestGps(){
 if(window.Capacitor?.isNativePlatform?.()===true){
  const native=window.Capacitor.Plugins?.Geolocation;
  if(!native?.getCurrentPosition)return Promise.reject(new Error('GPS natif indisponible'));
  return native.getCurrentPosition({enableHighAccuracy:false,maximumAge:0,timeout:15000});
 }
 if(!window.isSecureContext||!navigator.geolocation?.getCurrentPosition)
  return Promise.reject(new Error('Le GPS nécessite Safari HTTPS et la localisation autorisée.'));
 return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,
  {enableHighAccuracy:false,maximumAge:0,timeout:15000}));
}
async function refresh(){
 if(busy)return;
 const results=$('sgAvailableDriversResults'),button=$('sgAvailableDriversRun');
 if(!results||!button)return;
 if(typeof client==='undefined'||!client?.availableDrivers?.list){
  status('Connexion aux données SAMGO TEST indisponible. Réessayez depuis le site officiel.');
  return;
 }
 const generation=++requestGeneration;
 busy=true;button.disabled=true;results.replaceChildren();
 status('Vérification du GPS puis recherche des chauffeurs approuvés et disponibles…');
 try{
  const gps=await requestGps();
  if(generation!==requestGeneration)return;
  const coords=gps?.coords,lat=coords?.latitude,lng=coords?.longitude;
  if(typeof lat!=='number'||typeof lng!=='number'||
   !Number.isFinite(lat)||!Number.isFinite(lng)||
   Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('Position GPS invalide.');
  const found=await client.availableDrivers.list();
  if(generation!==requestGeneration)return;
  if(found.error)throw found.error;
  const list=safeRows(found.data,{lat,lng});
  if(!list.length){
   status('Aucun chauffeur disponible avec une position récente dans un rayon approximatif de 50 km. Aucune disponibilité fictive affichée.');
   return;
  }
  for(const item of list){
   const box=document.createElement('div');box.className='sg-available-row';
   const name=document.createElement('strong');name.textContent='🟢 '+item.name+' — disponible (TEST)';
   const detail=document.createElement('p');
   detail.textContent=item.band+'. Zone approximative uniquement ; réservation réelle impossible.';
   box.append(name,detail);results.append(box);
  }
  status(list.length+' chauffeur(s) approuvé(s) et disponibles avec une position récente. Distances approximatives, jamais une adresse ou un suivi exact.');
 }catch(error){
  const reason=String(error?.message||'').toLowerCase();
  const denied=Number(error?.code)===1||/denied|permission|refus/.test(reason);
  status(denied?'Localisation refusée. Autorisez SAMGO dans les réglages de Safari et réessayez.'
   :'Recherche impossible pour le moment. Vérifiez Internet et l’autorisation de localisation, puis réessayez.');
 }finally{if(generation===requestGeneration){busy=false;button.disabled=false;}}
}
window.sgAvailableDrivers={refresh,safeRows,band};
})();