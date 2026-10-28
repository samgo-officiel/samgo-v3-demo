/* SAMGO V3 — annonces géolocalisées de test, sans notification push de fond.
 * Geolocation uniquement après consentement, jamais enregistrée côté chauffeur.
 * Les annonces contiennent uniquement des coordonnées CLIENT arrondies (~1 km).
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const radiusOptions=[5,10,20,30,50];
const state={pos:null,rows:[],replies:[],loading:false,poll:null,notify:false,firstLoad:true,seen:new Set(),lastUser:null,clientLoad:0,responding:null,replyGeneration:0,publishGeneration:0,gpsPending:false,gpsGeneration:0,fetchGeneration:0,fetchKey:null};
function status(id,msg){const node=$(id);if(node)node.textContent=msg;}
function euros(x){return Number(x).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});}
function remainingTime(expireAt,now=Date.now()){
 const minutes=Math.ceil((Number(expireAt)-now)/60000);
 if(!Number.isFinite(minutes)||minutes<=0)return 'expirée';
 if(minutes<60)return 'expire dans environ '+minutes+' min';
 const hours=Math.floor(minutes/60),rest=minutes%60;
 return 'expire dans environ '+hours+' h'+(rest?' '+rest+' min':'');
}
function normalizePosition(p){
 const lat=Number(p?.coords?.latitude),lng=Number(p?.coords?.longitude);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)
  throw new Error('Position GPS invalide. Réessayez depuis votre téléphone ou navigateur.');
 return {lat,lng,accuracy:Math.max(0,Number(p.coords?.accuracy)||0),
  measuredAt:Number(p.timestamp)||Date.now()};
}
function requestLocation(){
 // Dans l'application native, le GPS du système est obtenu avec Capacitor.
 // Le composant n'est sollicité que lors d'un clic explicite du client ou chauffeur.
 if(window.Capacitor?.isNativePlatform?.()===true){
  const plugin=window.Capacitor.Plugins?.Geolocation;
  if(!plugin?.getCurrentPosition)
   return Promise.reject(new Error('Module GPS natif indisponible. Réinstallez une version de test récente de SAMGO.'));
  return plugin.getCurrentPosition({enableHighAccuracy:false,maximumAge:60000,timeout:12000})
   .then(normalizePosition)
   .catch(error=>{
    if(error?.message?.includes('Position GPS invalide'))throw error;
    const info=String(error?.message||'').toLowerCase();
    if(info.includes('denied')||info.includes('permission')||info.includes('refus'))
     throw new Error('Localisation refusée. Autorisez SAMGO dans les réglages de localisation du téléphone.');
    throw new Error('GPS natif indisponible. Vérifiez les réglages de localisation et réessayez.');
   });
 }
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(new Error('La géolocalisation n’est pas disponible dans ce navigateur.'));return;}
  if(!window.isSecureContext){reject(new Error('Le GPS nécessite HTTPS.'));return;}
  navigator.geolocation.getCurrentPosition(
   p=>{try{resolve(normalizePosition(p));}catch(e){reject(e);}},
   e=>reject(new Error(e.code===1?'Localisation refusée. Autorisez-la dans les réglages de localisation de votre navigateur ou téléphone.':e.code===2?'Position introuvable. Vérifiez le GPS.':'Le GPS ne répond pas. Réessayez.')),
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
function sortRequests(rows,mode){
 const order=['proximite','tarif','trajet'].includes(mode)?mode:'proximite';
 const safe=(value,missing)=>value==null||value===''||!Number.isFinite(Number(value))?missing:Number(value);
 return rows.slice().sort((a,b)=>{
  if(order==='tarif'){
   const byPrice=safe(b.tarif_indicatif,-1)-safe(a.tarif_indicatif,-1);
   if(byPrice)return byPrice;
  }
  if(order==='trajet'){
   const byDistance=safe(a.distance_km,Infinity)-safe(b.distance_km,Infinity);
   if(byDistance)return byDistance;
  }
  return safe(a.approach,Infinity)-safe(b.approach,Infinity);
 });
}
function filterRequests(rows,query){
 const normalise=value=>String(value==null?'':value)
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR');
 const terms=normalise(query).trim().slice(0,80).split(/\s+/).filter(Boolean);
 if(!terms.length)return rows.slice();
 return rows.filter(row=>{
  const target=normalise((row.depart_test||'')+' '+(row.destination_test||''));
  return terms.every(term=>target.includes(term));
 });
}
function render(){
 const list=$('sgNearbyList');
 if(!list)return;
 list.replaceChildren();
 const radius=Number($('sgRadius').value)||30;
 status('sgRadiusValue',radius+' km');
 if(!state.pos){
  window.sgProximityMap?.clear();
  status('sgNearbyStatus','Activez votre localisation pour chercher des demandes de test.');
  return;
 }
 if(!approved()){
  window.sgProximityMap?.clear();
  status('sgNearbyStatus','Connectez-vous avec un compte chauffeur approuvé (test).');
  return;
 }
 const filtered=state.rows.filter(r=>{
  const lat=Number(r.latitude_approx),lon=Number(r.longitude_approx);
  return r.client_id!==sessionUser.id&&Number.isFinite(lat)&&Number.isFinite(lon)&&nearKm(state.pos.lat,state.pos.lng,lat,lon)<=radius;
 }).map(r=>({...r,approach:nearKm(state.pos.lat,state.pos.lng,Number(r.latitude_approx),Number(r.longitude_approx))}));
 const query=$('sgDemandTextFilter')?.value||'';
 const sorted=sortRequests(filterRequests(filtered,query),$('sgDemandSort')?.value||'proximite');
 status('sgNearbyStatus',sorted.length+' demande'+(sorted.length===1?'':'s')+' de test affichée'+(sorted.length===1?'':'s')+
  ' parmi '+filtered.length+' dans un rayon de '+radius+' km. Distance approximative.'+(query.trim()?' Filtre texte actif.':''));
 window.sgProximityMap?.render({center:state.pos,requests:sorted,radius});
 for(const req of sorted){
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
  card.append(head,route,details,foot);
  const replied=state.replies.some(answer=>answer.annonce_id===req.id&&answer.chauffeur_id===sessionUser.id);
  const reply=document.createElement('button');
  reply.type='button';reply.className='sg-demo-interest';
  reply.textContent=replied?'✓ Intérêt déjà envoyé (test)':'Je suis intéressé (test)';
  reply.disabled=replied||state.responding===req.id;
  if(!reply.disabled)reply.addEventListener('click',()=>sendInterest(req.id));
  card.append(reply);
  // Carte externe sur clic explicite : destination seulement approximative.
  // Ne jamais transmettre ici la position GPS precise du chauffeur.
  const zoneUrl=window.sgMapsZoneTest?.mapsUrl(req.latitude_approx,req.longitude_approx);
  if(zoneUrl){
   const mapLink=document.createElement('a');
   mapLink.className='sg-zone-map-btn';
   mapLink.href=zoneUrl;
   mapLink.target='_blank';
   mapLink.rel='noopener noreferrer';
   mapLink.textContent='📍 Voir zone approximative (carte externe TEST)';
   mapLink.setAttribute('aria-label','Ouvrir, volontairement, la zone approximative de l’annonce fictive sur une carte externe');
   card.append(mapLink);
   const walkingUrl=window.sgMapsZoneTest?.walkingRouteUrl?.(req.latitude_approx,req.longitude_approx);
   if(walkingUrl){
    const walkLink=document.createElement('a');
    walkLink.className='sg-zone-map-btn';
    walkLink.href=walkingUrl;
    walkLink.target='_blank';
    walkLink.rel='noopener noreferrer';
    walkLink.textContent='🚶 Itinéraire piéton vers la zone (TEST)';
    walkLink.setAttribute('aria-label','Ouvrir un itinéraire piéton vers une zone approximative, pas vers une adresse exacte');
    card.append(walkLink);
   }
  }
  list.append(card);
 }
}
function notifyAboutNew(rows){
 if(!signedIn())return;
 if(state.firstLoad){state.firstLoad=false;rows.forEach(r=>state.seen.add(r.id));return;}
 const radius=Number($('sgRadius').value)||30;
 const newly=rows.filter(r=>!state.seen.has(r.id)&&r.client_id!==sessionUser.id);
 rows.forEach(r=>state.seen.add(r.id));
 if(!state.notify||!state.pos||document.visibilityState!=='visible')return;
 const local=newly.filter(r=>{
  const distance=nearKm(state.pos.lat,state.pos.lng,Number(r.latitude_approx),Number(r.longitude_approx));
  return Number.isFinite(distance)&&distance<=radius;
 });
 if(local.length){
  status('sgInAppAlert','🔔 '+local.length+' nouvelle(s) demande(s) de test dans un rayon de '+radius+' km !');
  const alert=$('sgInAppAlert');alert.hidden=false;
  const toast=$('sgRequestToast'),toastText=$('sgRequestToastText');
  if(toast&&toastText){toastText.textContent=local.length+' nouvelle(s) demande(s) de test près de vous !';toast.hidden=false;}
  if('Notification' in window&&Notification.permission==='granted'&&document.visibilityState==='visible'){
   try{new Notification('SAMGO — nouvelle demande de test',{body:local.length+' annonce(s) de test à proximité. Ouvrez Missions.',tag:'samgo-test-demandes'});}catch(_){}
  }
 }
}
async function fetchRows(silent){
 if(!approved()||!state.pos||state.fetchKey||document.visibilityState==='hidden')return;
 // Ne pas réutiliser indéfiniment une ancienne localisation (aucun suivi GPS de fond).
 if(Date.now()-state.pos.measuredAt>15*60*1000){
  stop();
  status('sgGeoStatus','Votre dernière position GPS date de plus de 15 minutes. Appuyez sur « Activer / actualiser mon GPS » pour relancer la recherche.');
  return;
 }
 const currentId=sessionUser.id,currentGeneration=state.fetchGeneration;
 const position=state.pos,fetchKey={};
 state.fetchKey=fetchKey;
 const stillCurrent=()=>state.fetchKey===fetchKey&&state.fetchGeneration===currentGeneration&&
  state.pos===position&&approved()&&sessionUser.id===currentId;
 try{
  const [result,replies]=await Promise.all([
   client.testRequests.list(position,Number($('sgRadius').value)||30),client.testReplies.list()
  ]);
  if(!stillCurrent())return;
  if(result.error)throw result.error;
  if(replies.error)throw replies.error;
  state.replies=Array.isArray(replies.data)?replies.data:[];
  const rows=Array.isArray(result.data)?result.data:[];
  state.rows=rows;
  notifyAboutNew(rows);
  render();
 }catch(e){
  if(stillCurrent())status('sgNearbyStatus',
    'Actualisation GPS indisponible. Les résultats affichés peuvent être anciens : '+(e.message||'réessayez.'));
 }finally{if(state.fetchKey===fetchKey)state.fetchKey=null;}
}
async function open(){
 if(!approved()){
  status('sgGeoStatus','Connectez-vous avec votre compte chauffeur approuvé en version test.');
  return;
 }
 if(state.gpsPending)return;
 if(typeof driverTab==='function')driverTab('missions');
 const userId=sessionUser.id,generation=++state.gpsGeneration;
 state.gpsPending=true;
 const stopButton=$('sgGeoStop');if(stopButton)stopButton.disabled=false;
 try{
  status('sgGeoStatus','Demande de localisation sur cet appareil…');
  const position=await requestLocation();
  if(generation!==state.gpsGeneration||!approved()||sessionUser.id!==userId)return;
  if(document.visibilityState==='hidden'){
   stop();
   status('sgGeoStatus','Recherche GPS annulée : SAMGO a été masqué. Réactivez-la depuis Missions.');
   return;
  }
  if(position.accuracy>5000)throw new Error('Position GPS trop imprécise (±'+
    Math.round(position.accuracy)+' m). Activez la localisation précise puis réessayez.');
  ++state.fetchGeneration;state.fetchKey=null;
  state.pos=position;state.lastUser=userId;
  state.firstLoad=true;state.seen.clear();state.rows=[];state.replies=[];
  const accuracy=position.accuracy>0?' · précision annoncée ±'+Math.round(position.accuracy)+' m':'';
  status('sgGeoStatus','GPS actif'+accuracy+'. Position exacte conservée dans ce navigateur uniquement. Recherche serveur avec une zone arrondie (~11 km), sans suivi en arrière-plan.');
  render();
  await fetchRows(false);
  if(generation!==state.gpsGeneration)return;
  if(state.poll)clearInterval(state.poll);
  state.poll=setInterval(()=>fetchRows(true),30000);
 }catch(e){
  if(generation===state.gpsGeneration){
    status('sgGeoStatus',e.message||'Impossible de déterminer votre position.');
    if(!state.pos){const btn=$('sgGeoStop');if(btn)btn.disabled=true;}
   }
 }finally{
  if(generation===state.gpsGeneration)state.gpsPending=false;
 }
}
async function publish(){
 if(typeof navigator!=='undefined'&&navigator.onLine===false){
  status('sgPublishStatus','Hors connexion : annonce non publiée. Rétablissez Internet avant de demander le GPS.');
  return;
 }
 const box=$('sgPublishConsent');
 if(!box||!box.checked){status('sgPublishStatus','Confirmez que vos lieux sont fictifs et que vous acceptez de partager une position approximative pour 2 heures.');return;}
 if(!signedIn()){status('sgPublishStatus','Connectez-vous dans Compte avant de publier une demande de test.');return;}
 if(typeof localDemoRequest==='undefined'||!localDemoRequest){status('sgPublishStatus','Créez d’abord une simulation de trajet.');return;}
 const btn=$('sgPublishBtn');btn.disabled=true;
 const requestingUserId=sessionUser.id,requestGeneration=state.publishGeneration;
 try{
  status('sgPublishStatus','Autorisez le GPS : SAMGO arrondira votre position avant publication.');
  const p=await requestLocation();
  if(!signedIn()||sessionUser.id!==requestingUserId)throw new Error('Le compte a changé pendant la demande GPS. Recommencez.');
  if(document.visibilityState==='hidden')
   throw new Error('Publication annulée : SAMGO a été masqué pendant la demande GPS.');
  if(p.accuracy>5000)throw new Error('Position trop imprécise pour publier une annonce fictive (±'+
    Math.round(p.accuracy)+' m). Activez la localisation précise et réessayez.');
  const req=localDemoRequest;
  if(!req)throw new Error('Créez à nouveau la simulation avant la publication.');
  const payload={client_id:sessionUser.id,
   depart_test:String(req.from).trim().slice(0,60),
   destination_test:String(req.to).trim().slice(0,60),
   latitude_approx:Math.round(p.lat*100)/100,
   longitude_approx:Math.round(p.lng*100)/100,
   distance_km:Number(req.km)};
  if(payload.depart_test.length<3||payload.destination_test.length<3)throw new Error('Utilisez des noms de lieux fictifs comportant au moins trois caractères.');
  const result=await client.testRequests.create(payload);
  if(state.publishGeneration!==requestGeneration||!signedIn()||sessionUser.id!==requestingUserId)return;
  if(result.error)throw result.error;
  status('sgPublishStatus','Annonce de test publiée pendant deux heures maximum. Seuls les comptes chauffeurs de test approuvés peuvent la voir. Aucune vraie course créée.');
  box.checked=false;
  await refreshClient();
 }catch(e){
  if(state.publishGeneration===requestGeneration&&signedIn()&&sessionUser.id===requestingUserId)
   status('sgPublishStatus',e.message||'Publication impossible.');
 }
 finally{btn.disabled=false;}
}

async function sendInterest(adId){
 if(!approved()||state.responding)return;
 const ad=state.rows.find(r=>r.id===adId);
 if(!ad||ad.client_id===sessionUser.id){status('sgNearbyStatus','Cette demande de test n’est plus disponible.');return;}
 const uid=sessionUser.id,requestGeneration=++state.replyGeneration;
 const stillCurrent=()=>state.replyGeneration===requestGeneration&&approved()&&
   sessionUser.id===uid&&state.pos!==null;
 state.responding=adId;
 try{
  const result=await client.testReplies.create(adId,uid);
  if(!stillCurrent())return;
  if(result.error)throw result.error;
  const response={annonce_id:adId,chauffeur_id:uid,statut:'interesse_test'};
  state.replies.push(response);
  render();
  status('sgNearbyStatus','✓ Réponse de test enregistrée. Le client pourra voir qu’un chauffeur est intéressé. Aucune course réservée.');
 }catch(e){
  if(!stillCurrent())return;
  if(String(e.code||'')==='23505'||String(e.message||'').includes('duplicate key')){
   await fetchRows(false);
  }else status('sgNearbyStatus','Impossible d’envoyer cette réponse : '+(e.message||'Réessayez.'));
 }finally{
  if(state.replyGeneration===requestGeneration)state.responding=null;
 }
}
async function refreshClient(){
 const list=$('sgMyAdsList');
 if(!list)return;
 if(!signedIn()){
  list.replaceChildren();
  status('sgMyAdsStatus','Connectez-vous à votre compte client pour consulter les annonces de test.');
  return;
 }
 const currentId=sessionUser.id;
 const sequence=++state.clientLoad;
 status('sgMyAdsStatus','Chargement de vos annonces de test…');
 try{
  const [ads,answers,choices]=await Promise.all([client.testRequests.mine(currentId),client.testReplies.list(),client.testChoices.list()]);
  if(sequence!==state.clientLoad||!signedIn()||sessionUser.id!==currentId)return;
  for(const request of [ads,answers,choices])if(request.error)throw request.error;
  const ownAds=Array.isArray(ads.data)?ads.data:[];
  const allAnswers=Array.isArray(answers.data)?answers.data:[];
  const selected=Array.isArray(choices.data)?choices.data:[];
  if(!ownAds.length){
   list.replaceChildren();
   status('sgMyAdsStatus','Aucune annonce de test publiée depuis ce compte. Pour publier, utilisez Réserver.');
   return;
  }
  // Conserver les anciennes cartes tant que l'actualisation n'est pas
  // terminée ; ne vider que lorsque la nouvelle lecture a réellement réussi.
  list.replaceChildren();
  const now=Date.now();
  status('sgMyAdsStatus',ownAds.length+' annonce(s) de test retrouvée(s) pour ce compte.');
  for(const ad of ownAds){
   const box=document.createElement('article');box.className='sg-reply-card';
   const title=document.createElement('strong');title.textContent=ad.depart_test+' → '+ad.destination_test;
   const exp=Date.parse(ad.expire_le),active=ad.statut==='test_en_attente'&&exp>now;
   const count=allAnswers.filter(row=>row.annonce_id===ad.id).length;
   const meta=document.createElement('p');meta.textContent=(active?'Active (test), '+remainingTime(exp,now):'Expirée (test)')+' · '+Number(ad.distance_km)+' km · '+count+' réponse(s) de chauffeurs intéressés (test).';
   box.append(title,meta);
   const hasChoice=selected.some(choice=>choice.annonce_id===ad.id&&choice.client_id===currentId);
   if(hasChoice){
    const info=document.createElement('p');
    info.textContent='Historique protégé : cette annonce ne peut pas être supprimée depuis ici après le choix d’un chauffeur fictif. Utilisez le suivi de test ci-dessous.';
    box.append(info);
   }else{
    const remove=document.createElement('button');remove.type='button';
    remove.textContent=active?'Retirer cette annonce de test':'Supprimer cette ancienne annonce de test';
    remove.addEventListener('click',()=>removeClientAd(ad.id));
    box.append(remove);
   }
   list.append(box);
  }
 }catch(e){
  if(sequence===state.clientLoad&&signedIn()&&sessionUser.id===currentId)
   status('sgMyAdsStatus','Impossible de consulter vos annonces : '+(e.message||'Réessayez.'));
 }
}
async function removeClientAd(adId){
 if(!signedIn())return;
 if(typeof window.confirm==='function'&&!window.confirm('Retirer cette annonce de test ? Les chauffeurs ne la verront plus.'))return;
 const uid=sessionUser.id;
 const result=await client.testRequests.remove(adId,uid);
 if(!signedIn()||sessionUser.id!==uid)return;
 if(result.error){status('sgMyAdsStatus','Suppression impossible : '+(result.error.message||'Réessayez.'));return;}
 await refreshClient();
 if(signedIn()&&sessionUser.id===uid)
  status('sgMyAdsStatus','Annonce de test supprimée. Les chauffeurs ne la voient plus.');
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
function stop({clearClient=false}={}){
 const stopButton=$('sgGeoStop');if(stopButton)stopButton.disabled=true;
 ++state.gpsGeneration;++state.fetchGeneration;++state.replyGeneration;
 state.responding=null;
 state.fetchKey=null;state.gpsPending=false;state.lastUser=null;
 if(state.poll){clearInterval(state.poll);state.poll=null;}
 state.pos=null;state.rows=[];state.replies=[];state.notify=false;state.firstLoad=true;state.seen.clear();
 window.sgProximityMap?.clear();
 const b=$('sgNotifyToggle');if(b){b.textContent='Activer les alertes pendant la visite';b.setAttribute('aria-pressed','false');}
 // Arrêter le GPS chauffeur ne doit pas effacer l'historique client.
 // Seul un changement de compte / une déconnexion purge la vue privée.
 if(clearClient){
  ++state.publishGeneration;
  state.clientLoad++;
  const clientAds=$('sgMyAdsList');if(clientAds)clientAds.replaceChildren();
  status('sgMyAdsStatus','Connectez-vous pour voir les annonces publiées.');
 }
 const a=$('sgInAppAlert');if(a){a.hidden=true;a.textContent='';}
 const toast=$('sgRequestToast');if(toast)toast.hidden=true;
 status('sgGeoStatus','GPS non activé. Votre position chauffeur n’est pas enregistrée.');
 status('sgNotifyStatus','Alertes désactivées.');
 render();
}
function authChanged(){
 if(!signedIn())stop({clearClient:true});
 else if(state.lastUser&&sessionUser.id!==state.lastUser)stop({clearClient:true});
 else if(!approved())stop();
}
function filterChanged(){
 // Filtre purement local, jamais de requête réseau ni d'autorisation GPS.
 render();
}
function sortChanged(){
 window.sgDriverPrefs?.save?.();
 render();
}
function radiusChanged({savePreference=true}={}){
 if(savePreference)window.sgDriverPrefs?.save?.();
 ++state.fetchGeneration;state.fetchKey=null;
 render();
 if(state.pos)fetchRows(false);
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')fetchRows(true);});
window.sgDemand={open,publish,optIn,refresh:()=>fetchRows(false),refreshClient,render,stop,authChanged,radiusChanged,sortChanged,filterChanged,sortRequests,filterRequests,remainingTime};
})();
