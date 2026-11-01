/* SAMGO TEST — vraie carte routière et zones chaudes fictives pour chauffeurs.
 * Les 3 concentrations sont inventées : aucune demande ou disponibilité réelle.
 * GPS uniquement sur clic. Seul un centre arrondi au dixième de degré
 * est utilisé pour afficher les tuiles externes ; jamais la coordonnée exacte.
 * Fond © OpenStreetMap, affichage Leaflet 1.9.4 à la demande (HTTPS).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const sample={lat:44.8,lng:-0.6};
const fakeClusters=Object.freeze([
 {code:'J',east:-3,north:3,count:4},
 {code:'O',east:4,north:0,count:9},
 {code:'R',east:0,north:-5,count:18}
]);
const tileUrl='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const leafletJs='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const leafletCss='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
let map=null,loading=null,pending=false,generation=0;
let lastCoarseCenter=null,mode='demo',recordedZones=[];
function approvedDriver(){
 return typeof client!=='undefined'&&!!client?.testRequests?.list&&
  typeof sessionUser!=='undefined'&&!!sessionUser&&
  typeof driverSimAllowed!=='undefined'&&driverSimAllowed===true;
}
function aggregateRequests(rows,now=Date.now()){
 // Afficher seulement des secteurs de 0,1° avec au moins 3 clients distincts.
 // Jamais de marqueur sur le lieu individuel d'un client, ni de coordonnée
 // précise transmise au fond cartographique.
 if(!Array.isArray(rows))return [];
 const groups=new Map();
 for(const row of rows.slice(0,100)){
  const lat=Number(row?.latitude_approx),lng=Number(row?.longitude_approx);
  const exp=Date.parse(String(row?.expire_le||''));
  const uid=row?.client_id;
  if(row?.statut!=='test_en_attente'||!uid||!Number.isFinite(exp)||exp<=now||
   row.latitude_approx==null||row.longitude_approx==null||
   !Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>179)continue;
  const cellLat=Math.floor(lat*10),cellLng=Math.floor(lng*10),key=cellLat+','+cellLng;
  if(!groups.has(key))groups.set(key,{lat:(cellLat+0.5)/10,lng:(cellLng+0.5)/10,users:new Set()});
  groups.get(key).users.add(String(uid));
 }
 return [...groups.values()].filter(g=>g.users.size>=3)
  .map(g=>({lat:g.lat,lng:g.lng,count:g.users.size}))
  .slice(0,25);
}

function status(message){const p=$('sgDriverHotmapStatus');if(p)p.textContent=message;}
function validCoords(position){
 const lat=position?.coords?.latitude,lng=position?.coords?.longitude;
 if(typeof lat!=='number'||typeof lng!=='number'||
    !Number.isFinite(lat)||!Number.isFinite(lng)||
    Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('Position GPS invalide.');
 return {lat:Math.round(lat*10)/10,lng:Math.round(lng*10)/10};
}
function nearbyDemoPoints(center){
 // Décalages géographiques fixes, entièrement fictifs ; aucun client réel.
 const cos=Math.max(0.2,Math.abs(Math.cos(center.lat*Math.PI/180)));
 return fakeClusters.map(c=>({
  code:c.code,count:c.count,
  lat:Math.max(-85,Math.min(85,center.lat+c.north/111.2)),
  lng:Math.max(-179,Math.min(179,center.lng+c.east/(111.2*cos)))
 }));
}
function loadLeaflet(){
 if(window.L?.map&&window.L?.circle)return Promise.resolve(window.L);
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  if(!document.head?.append){reject(new Error('Impossible de charger les ressources cartographiques.'));return;}
  const css=document.createElement('link');
  css.rel='stylesheet';css.href=leafletCss;
  css.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  css.crossOrigin='anonymous';
  const script=document.createElement('script');
  script.src=leafletJs;
  script.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
  script.crossOrigin='anonymous';
  let cssOK=false,scriptOK=false,ended=false;
  function finish(error){
   if(ended)return;
   if(error){ended=true;reject(error);return;}
   if(cssOK&&scriptOK){
    ended=true;
    if(window.L?.map&&window.L?.circle)resolve(window.L);
    else reject(new Error('Le module de carte est indisponible.'));
   }
  }
  css.onload=()=>{cssOK=true;finish();};
  css.onerror=()=>finish(new Error('Le style de la carte n’a pas pu être chargé.'));
  script.onload=()=>{scriptOK=true;finish();};
  script.onerror=()=>finish(new Error('Le module de carte n’a pas pu être chargé.'));
  document.head.append(css);
  document.head.append(script);
 }).catch(error=>{loading=null;throw error;});
 return loading;
}
function readGps(){
 if(window.Capacitor?.isNativePlatform?.()===true){
  const gps=window.Capacitor.Plugins?.Geolocation;
  if(!gps?.getCurrentPosition)return Promise.reject(new Error('GPS natif indisponible.'));
  return gps.getCurrentPosition({enableHighAccuracy:false,maximumAge:0,timeout:15000});
 }
 if(!window.isSecureContext)return Promise.reject(new Error('Le GPS nécessite HTTPS.'));
 if(!navigator.geolocation?.getCurrentPosition)return Promise.reject(new Error('GPS indisponible dans ce navigateur.'));
 return new Promise((resolve,reject)=>{
  navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:0,timeout:15000});
 });
}
function resetMap(){
 if(map){try{map.remove();}catch(_){}map=null;}
 const root=$('sgDriverHotmapView');if(root)root.replaceChildren();
}
function draw(L,center){
 resetMap();
 const root=$('sgDriverHotmapView');if(!root)return;
 // Ce centre est un arrondissement d'environ 11 km ; la carte n'est pas
 // centrée sur l'adresse exacte du chauffeur.
 map=L.map(root,{scrollWheelZoom:false,zoomControl:true,attributionControl:true})
  .setView([center.lat,center.lng],11);
 L.tileLayer(tileUrl,{
  attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom:17
 }).addTo(map);
 L.circleMarker([center.lat,center.lng],{
  radius:8,color:'#d5ffff',weight:2,fillColor:'#60d4d1',fillOpacity:0.95
 }).addTo(map).bindPopup('Centre approximatif de la carte — pas votre position précise.');
 for(const p of (mode==='recorded'?recordedZones:nearbyDemoPoints(center))){
  const color=p.count>=12?'#db3828':p.count>=6?'#ef902a':'#ffdf53';
  // Trois disques concentriques transparents créent une zone diffuse :
  // intensité correspondant uniquement à des volumes inventés.
  const outer=L.circle([p.lat,p.lng],{radius:2000,stroke:false,fillColor:color,fillOpacity:0.12}).addTo(map);
  L.circle([p.lat,p.lng],{radius:1100,stroke:false,fillColor:color,fillOpacity:0.22}).addTo(map);
  L.circle([p.lat,p.lng],{radius:460,stroke:false,fillColor:color,fillOpacity:0.42}).addTo(map);
  outer.bindPopup(mode==='recorded'
   ? 'Zone agrégée : '+p.count+' annonces de TEST provenant de comptes distincts. Aucune adresse exacte.'
   : 'Zone chaude TEST — '+p.count+' demandes FICTIVES. Aucune vraie demande.');
 }
 // Attendre que la zone soit effectivement visible, surtout après navigation
 // vers le panneau chauffeur dans Safari.
 if(typeof map.invalidateSize==='function')map.invalidateSize();
}
async function open(){
 if(pending)return;
 const root=$('sgDriverHotmapView'),button=$('sgDriverHotmapStart');
 if(!root||!button)return;
 if(navigator.onLine===false){
  status('Carte indisponible hors connexion. La démo exige Internet pour les rues.');
  return;
 }
 const current=++generation;pending=true;button.disabled=true;
 mode='demo';recordedZones=[];lastCoarseCenter=null;
 status('Chargement de la carte… La localisation ne sera demandée que pour cette action.');
 try{
  // Au clic seulement : en cas de refus GPS, afficher Bordeaux comme exemple
  // explicite plutôt que d’inventer la position du chauffeur.
  let center=sample,geoLabel='Exemple Bordeaux : le GPS n’a pas été autorisé.';
  try{
   const position=await readGps();
   if(current!==generation)return;
   center=validCoords(position);
   geoLabel='Centre basé sur votre zone approximative (arrondie à 0,1°).';
  }catch(_){if(current!==generation)return;}
  lastCoarseCenter=center;
  const L=await loadLeaflet();
  if(current!==generation)return;
  draw(L,center);
  status('Carte routière TEST affichée. '+geoLabel+
   ' Jaune = 4, orange = 9, rouge = 18 demandes entièrement FICTIVES. '+
   'Aucune adresse précise transmise, aucune réservation réelle.');
  const stop=$('sgDriverHotmapStop');if(stop)stop.disabled=false;
 }catch(error){
  if(current===generation){
   resetMap();
   status('La carte n’a pas pu se charger. Vérifiez Internet, puis réessayez. '+
    'Le test GPS simple reste disponible dans Compte.');
  }
 }finally{if(current===generation){pending=false;button.disabled=false;}}
}
async function showRecorded(){
 if(!approvedDriver()){
  status('Accès réservé aux chauffeurs de TEST approuvés et connectés. Aucune annonce privée n’est partagée sans autorisation.');
  return;
 }
 if(pending){status('Terminez le chargement de la carte avant de consulter les annonces de test.');return;}
 if(!map||!lastCoarseCenter){
  status('Ouvrez d’abord la carte avec « Afficher les zones chaudes ».');return;
 }
 const button=$('sgDriverHotmapRecorded'),current=++generation;
 if(button)button.disabled=true;
 status('Consultation des annonces de TEST accessibles au chauffeur approuvé…');
 try{
  const result=await client.testRequests.list(lastCoarseCenter,50);
  if(current!==generation||!approvedDriver()||!map)return;
  if(result.error)throw result.error;
  const rows=Array.isArray(result.data)?result.data:[];
  recordedZones=aggregateRequests(rows);
  mode='recorded';
  draw(window.L,lastCoarseCenter);
  status(recordedZones.length
   ? 'Zones chaudes calculées à partir des annonces de TEST enregistrées. Regroupement par secteur d’environ 11 km et 3 clients distincts minimum. Aucune adresse individuelle visible.'
   : 'Aucune zone chaude de TEST suffisamment dense (minimum 3 demandes de clients distincts dans le même secteur). Les annonces isolées restent privées. Aucune demande fictive ajoutée.');
 }catch(_){
  if(current===generation)status('Impossible de charger les demandes de TEST. Vérifiez votre session chauffeur approuvé et réessayez.');
 }finally{if(button)button.disabled=false;}
}
function close(){
 ++generation;pending=false;lastCoarseCenter=null;recordedZones=[];mode='demo';resetMap();
 const start=$('sgDriverHotmapStart'),stop=$('sgDriverHotmapStop');
 if(start)start.disabled=false;if(stop)stop.disabled=true;
 status('Carte fermée. Aucun suivi GPS actif.');
}
window.sgDriverHotmap={open,close,showRecorded,aggregateRequests,nearbyDemoPoints,validCoords};
})();
