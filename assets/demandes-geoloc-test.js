/* SAMGO V3 — annonces géolocalisées de test, sans notification push de fond.
 * Geolocation uniquement après consentement, jamais enregistrée côté chauffeur.
 * Les annonces contiennent uniquement des coordonnées CLIENT arrondies (~1 km).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const radiusOptions=[5,10,20,30,50];
const state={pos:null,rows:[],loading:false,poll:null,notify:false,firstLoad:true,seen:new Set(),lastUser:null};
function status(id,msg){const node=$(id);if(node)node.textContent=msg;}
function euros(x){return Number(x).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});}
function requestLocation(){
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(new Error('La géolocalisation n’est pas disponible dans ce navigateur.'));return;}
  if(!window.isSecureContext){reject(new Error('Le GPS nécessite HTTPS.'));return;}
  navigator.geolocation.getCurrentPosition(
   p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),
   e=>reject(new Error(e.code===1?'Localisation refusée. Autorisez-la dans les réglages Safari.':e.code===2?'Position introuvable. Vérifiez le GPS.':'Le GPS ne répond pas. Réessayez.')),
   {enableHighAccuracy:false,maximumAge:60000,timeout:12000}
  );
 });
}
function nearKm(a,b,c,d){
 const rad=Math.PI/180;
 const lat=(c-a)*rad,lon=(d-b)*rad;
 const h=Math.sin(lat/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(lon/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
}
function signedIn(){return typeof sessionUser!=='undefined'&&!!sessionUser&&!!client&&!!client.testRequests;}
function approved(){return signedIn()&&typeof driverSimAllowed!=='undefined'&&driverSimAllowed;}
function render(){
 const list=$('sgNearbyList');
 if(!list)return;
 list.replaceChildren();
 const radius=Number($('sgRadius').value)||30;
 status('sgRadiusValue',radius+' km');
 if(!state.pos){
  status('sgNearbyStatus','Activez votre localisation pour chercher des demandes de test.');
  return;
 }
 if(!approved()){
  status('sgNearbyStatus','Connectez-vous avec un compte chauffeur approuvé (test).');
  return;
 }
 const filtered=state.rows.filter(r=>{
  const lat=Number(r.latitude_approx),lon=Number(r.longitude_approx);
  return r.client_id!==sessionUser.id&&Number.isFinite(lat)&&Number.isFinite(lon)&&nearKm(state.pos.lat,state.pos.lng,lat,lon)<=radius;
 }).map(r=>({...r,approach:nearKm(state.pos.lat,state.pos.lng,Number(r.latitude_approx),Number(r.longitude_approx))})).sort((a,b)=>a.approach-b.approach);
 status('sgNearbyStatus',filtered.length+' demande'+(filtered.length===1?'':'s')+' de test dans un rayon de '+radius+' km. Distance approximative.');
 for(const req of filtered){
  const card=document.createElement('article');card.className='sg-nearby-card';
  const head=document.createElement('div');head.className='sg-nearby-top';
  const name=document.createElement('b');name.textContent='Demande de test';
  const dist=document.createElement('span');dist.textContent='≈ '+Math.round(req.approach)+' km';
  head.append(name,dist);
  const route=document.createElement('p');
  route.textContent=req.depart_test+' → '+req.destination_test;
  const details=document.createElement('small');
  details.textContent='Trajet choisi : '+Number(req.distance_km)+' km · Tarif indicatif : '+euros(req.tarif_indicatif)+' · Annonce fictive';
  const foot=document.createElement('p');foot.className='sg-demand-disclaimer';
  foot.textContent='Aucune course réelle, aucune acceptation possible.';
  card.append(head,route,details,foot);list.append(card);
 }
}
function notifyAboutNew(rows){
 if(state.firstLoad){state.firstLoad=false;rows.forEach(r=>state.seen.add(r.id));return;}
 const radius=Number($('sgRadius').value)||30;
 const newly=rows.filter(r=>!state.seen.has(r.id)&&r.client_id!==sessionUser.id);
 rows.forEach(r=>state.seen.add(r.id));
 if(!state.notify||!state.pos||!document.hidden===false)return;
 const local=newly.filter(r=>{
  const distance=nearKm(state.pos.lat,state.pos.lng,Number(r.latitude_approx),Number(r.longitude_approx));
  return Number.isFinite(distance)&&distance<=radius;
 });
 if(local.length){
  status('sgInAppAlert','🔔 '+local.length+' nouvelle(s) demande(s) de test dans un rayon de '+radius+' km !');
  const alert=$('sgInAppAlert');alert.hidden=false;
  if('Notification' in window&&Notification.permission==='granted'&&document.visibilityState==='visible'){
   try{new Notification('SAMGO — nouvelle demande de test',{body:local.length+' annonce(s) de test à proximité. Ouvrez Missions.',tag:'samgo-test-demandes'});}catch(_){}
  }
 }
}
async function fetchRows(silent){
 if(!approved()||!state.pos||state.loading||document.visibilityState==='hidden')return;
 state.loading=true;
 const currentId=sessionUser.id;
 try{
  const result=await client.testRequests.list();
  if(result.error)throw result.error;
  if(!signedIn()||sessionUser.id!==currentId)return;
  const rows=Array.isArray(result.data)?result.data:[];
  state.rows=rows;
  notifyAboutNew(rows);
  render();
 }catch(e){
  if(!silent)status('sgNearbyStatus','Impossible de charger les demandes : '+(e.message||'réessayez.'));
 }finally{state.loading=false;}
}
async function open(){
 if(!approved()){
  status('sgGeoStatus','Connectez-vous avec votre compte chauffeur approuvé en version test.');
  return;
 }
 if(typeof driverTab==='function')driverTab('missions');
 try{
  status('sgGeoStatus','Demande de localisation au navigateur…');
  const position=await requestLocation();
  if(!approved())return;
  state.pos=position;state.firstLoad=true;state.seen.clear();state.rows=[];
  status('sgGeoStatus','GPS activé sur cet appareil. La position du chauffeur n’est pas envoyée au serveur.');
  render();await fetchRows(false);
  if(state.poll)clearInterval(state.poll);
  state.poll=setInterval(()=>fetchRows(true),30000);
 }catch(e){status('sgGeoStatus',e.message||'Impossible de déterminer votre position.');}
}
async function publish(){
 const box=$('sgPublishConsent');
 if(!box||!box.checked){status('sgPublishStatus','Confirmez que vos lieux sont fictifs et que vous acceptez de partager une position approximative pour 2 heures.');return;}
 if(!signedIn()){status('sgPublishStatus','Connectez-vous dans Compte avant de publier une demande de test.');return;}
 if(typeof localDemoRequest==='undefined'||!localDemoRequest){status('sgPublishStatus','Créez d’abord une simulation de trajet.');return;}
 const btn=$('sgPublishBtn');btn.disabled=true;
 try{
  status('sgPublishStatus','Autorisez le GPS : SAMGO arrondira votre position avant publication.');
  const p=await requestLocation();
  if(!signedIn())return;
  const req=localDemoRequest;
  const payload={client_id:sessionUser.id,
   depart_test:String(req.from).trim().slice(0,60),
   destination_test:String(req.to).trim().slice(0,60),
   latitude_approx:Math.round(p.lat*100)/100,
   longitude_approx:Math.round(p.lng*100)/100,
   distance_km:Number(req.km)};
  if(payload.depart_test.length<3||payload.destination_test.length<3)throw new Error('Utilisez des noms de lieux fictifs comportant au moins trois caractères.');
  const result=await client.testRequests.create(payload);
  if(result.error)throw result.error;
  status('sgPublishStatus','Annonce de test publiée pendant deux heures maximum. Seuls les comptes chauffeurs de test approuvés peuvent la voir. Aucune vraie course créée.');
  box.checked=false;
 }catch(e){status('sgPublishStatus',e.message||'Publication impossible.');}
 finally{btn.disabled=false;}
}
async function optIn(){
 if(!approved()){status('sgGeoStatus','Ce compte chauffeur doit d’abord être approuvé (test).');return;}
 if(!state.pos){status('sgGeoStatus','Activez d’abord le GPS pour filtrer les alertes.');return;}
 state.notify=!state.notify;
 if(state.notify&&'Notification' in window&&Notification.permission==='default'){
  try{await Notification.requestPermission();}catch(_){}
 }
 const btn=$('sgNotifyToggle');
 btn.textContent=state.notify?'Désactiver les alertes de visite':'Activer les alertes pendant la visite';
 btn.setAttribute('aria-pressed',String(state.notify));
 status('sgNotifyStatus',state.notify?'Alertes actives tant que SAMGO est ouvert et visible. Ce ne sont pas des notifications push quand le site est fermé.':'Alertes désactivées.');
}
function stop(){
 if(state.poll){clearInterval(state.poll);state.poll=null;}
 state.pos=null;state.rows=[];state.notify=false;state.firstLoad=true;state.seen.clear();
 const b=$('sgNotifyToggle');if(b){b.textContent='Activer les alertes pendant la visite';b.setAttribute('aria-pressed','false');}
 const a=$('sgInAppAlert');if(a){a.hidden=true;a.textContent='';}
 status('sgGeoStatus','GPS non activé. Votre position chauffeur n’est pas enregistrée.');
 status('sgNotifyStatus','Alertes désactivées.');
 render();
}
function authChanged(){if(!approved())stop();}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')fetchRows(true);});
window.sgDemand={open,publish,optIn,refresh:()=>fetchRows(false),render,stop,authChanged};
})();
