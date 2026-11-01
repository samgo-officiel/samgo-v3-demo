/* SAMGO CLIENT — carte de chauffeurs fictifs, démonstration uniquement.
 * Aucune recherche réelle, aucun chauffeur/contact dans ce fichier.
 * Le GPS précis est uniquement vérifié sur clic : pas de stockage, log,
 * transmission serveur, suivi continu ou permission au chargement.
 */
(function(){
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const $=id=>document.getElementById(id);
 const drivers=Object.freeze([
  {id:'A',distance:2,angle:-32,available:true},
  {id:'B',distance:4,angle:78,available:false},
  {id:'C',distance:8,angle:155,available:true},
  {id:'D',distance:16,angle:251,available:true},
  {id:'E',distance:27,angle:340,available:false}
 ]);
 let active=false,pending=false,generation=0,precision=null,selected=null;

 function message(text){const el=$('sgClientMapStatus');if(el)el.textContent=text;}
 function svgElement(tag,attrs={},text=''){
  const node=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
  if(text)node.textContent=text;
  return node;
 }
 function circle(svg,x,y,r,fill,stroke){
  svg.append(svgElement('circle',{cx:x,cy:y,r,fill,stroke:stroke||'none','stroke-width':1.5}));
 }
 function radius(){
  const km=Number($('sgClientMapRadius')?.value);
  return [5,10,30].includes(km)?km:10;
 }
 function availableOnly(){return $('sgClientMapAvailableOnly')?.checked===true;}
 function shownDrivers(){
  const max=radius();
  return drivers.filter(d=>d.distance<=max&&(!availableOnly()||d.available));
 }
 function render(){
  const map=$('sgClientMapRadar'),list=$('sgClientMapProfiles');
  if(map)map.replaceChildren();
  if(list)list.replaceChildren();
  if(!active||!map||!list)return;
  const entries=shownDrivers(),limit=radius(),mid=160,outer=120;
  const svg=svgElement('svg',{
   viewBox:'0 0 320 320',role:'img',
   'aria-label':'Schéma de démonstration : '+entries.length+' profil(s) chauffeur entièrement fictifs. Ce ne sont pas des positions réelles.',
   focusable:'false'
  });
  circle(svg,mid,mid,outer,'#132834','#527083');
  circle(svg,mid,mid,outer*2/3,'none','#3b5361');
  circle(svg,mid,mid,outer/3,'none','#3b5361');
  for(const [label,x,y] of [['N',mid,25],['E',mid+137,mid+4],['S',mid,mid+142],['O',25,mid+4]]){
   svg.append(svgElement('text',{x,y,fill:'#d4e4eb','font-size':12,'font-weight':700,'text-anchor':'middle'},label));
  }
  circle(svg,mid,mid,10,'#7cddcf','#e6fff9');
  svg.append(svgElement('text',{x:mid,y:mid+27,fill:'#c5f3ea','font-size':11,'text-anchor':'middle'},'VOUS'));
  for(const d of entries){
   const angle=d.angle*Math.PI/180;
   const dist=d.distance/limit*(outer-12);
   const x=mid+Math.sin(angle)*dist,y=mid-Math.cos(angle)*dist;
   const group=svgElement('g');
   group.append(svgElement('title',{},'Profil TEST '+d.id+' : '+d.distance+' km fictifs, '+(d.available?'disponible fictivement':'indisponible fictivement')));
   circle(group,x,y,selected===d.id?13:11,d.available?'#4fd1a0':'#e68b88',selected===d.id?'#ffffff':'#172731');
   group.append(svgElement('text',{x,y:y+3.5,fill:'#09252b','font-size':11,'text-anchor':'middle','font-weight':700},d.id));
   svg.append(group);

   const card=document.createElement('div');card.className='sg-client-map-profile';
   const title=document.createElement('strong');
   title.textContent='Chauffeur TEST '+d.id;
   const detail=document.createElement('p');
   detail.textContent='≈ '+d.distance+' km fictifs · '+(d.available?'Disponible (simulation)':'Indisponible (simulation)');
   const btn=document.createElement('button');btn.type='button';
   btn.textContent=d.available?(selected===d.id?'✓ Profil fictif choisi':'Choisir en démo'):'Non sélectionnable';
   btn.disabled=!d.available;
   if(d.available)btn.addEventListener('click',()=>{
    selected=d.id;render();
    message('Profil TEST '+d.id+' sélectionné dans la simulation. Aucun chauffeur n’a été contacté et aucune course n’a été créée.');
   });
   card.append(title,detail,btn);
   list.append(card);
  }
  map.append(svg);
  if(!entries.length)message('Aucun profil fictif dans ce filtre. Augmentez le rayon ou désactivez « Disponibles seulement ». Aucune recherche réelle.');
  else if(!selected||!entries.some(d=>d.id===selected))
   message(entries.length+' chauffeur(s) TEST représenté(s) autour d’un centre fictif (rayon '+limit+' km). GPS vérifié'+(precision===null?'':', précision annoncée ±'+precision+' m')+'. Distances inventées : aucun chauffeur réel disponible sur cette carte.');
 }
 function requestGps(){
  if(window.Capacitor?.isNativePlatform?.()===true){
   const plugin=window.Capacitor.Plugins?.Geolocation;
   if(!plugin?.getCurrentPosition)return Promise.reject({code:2});
   return plugin.getCurrentPosition({enableHighAccuracy:true,maximumAge:0,timeout:15000});
  }
  if(!window.isSecureContext)return Promise.reject(new Error('HTTPS nécessaire pour accéder au GPS.'));
  if(!navigator.geolocation?.getCurrentPosition)return Promise.reject({code:2});
  return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,
   {enableHighAccuracy:true,maximumAge:0,timeout:15000}));
 }
 function gpsError(error){
  const code=Number(error?.code),str=String(error?.message||'').toLowerCase();
  if(str.includes('https'))return 'Connexion HTTPS nécessaire pour demander la position.';
  if(code===1||/denied|permission|refus/.test(str))
   return 'GPS refusé sur cet appareil. Autorisez la localisation pour SAMGO dans Safari ou dans les réglages du téléphone, puis réessayez.';
  if(code===3||/timeout|timed out/.test(str))return 'Le GPS met trop de temps à répondre. Réessayez près d’une fenêtre.';
  return 'GPS introuvable. Vérifiez les réglages de localisation puis réessayez.';
 }
 async function start(){
  if(pending)return;
  const button=$('sgClientMapStart');if(!button)return;
  pending=true;button.disabled=true;
  const current=++generation;
  message('Vérification de votre GPS… Aucun chauffeur réel n’est recherché.');
  try{
   const result=await requestGps();
   if(current!==generation)return;
   const coords=result?.coords;
   if(typeof coords?.latitude!=='number'||typeof coords?.longitude!=='number'||
      !Number.isFinite(coords.latitude)||!Number.isFinite(coords.longitude)||
      Math.abs(coords.latitude)>90||Math.abs(coords.longitude)>180)
    throw new Error('Coordonnées GPS invalides');
   // Ne garder QUE la précision ; supprimer toute référence à la position précise.
   const accuracy=Number(coords.accuracy);
   precision=Number.isFinite(accuracy)&&accuracy>0?Math.round(accuracy):null;
   active=true;selected=null;
   render();
   const stop=$('sgClientMapStop');if(stop)stop.disabled=false;
  }catch(error){
   if(current===generation){active=false;selected=null;precision=null;render();message(gpsError(error));}
  }finally{if(current===generation){pending=false;button.disabled=false;}}
 }
 function stop(){
  ++generation;active=false;pending=false;precision=null;selected=null;
  const startButton=$('sgClientMapStart');if(startButton)startButton.disabled=false;
  const stopButton=$('sgClientMapStop');if(stopButton)stopButton.disabled=true;
  render();
  message('Carte fictive effacée. Aucun suivi GPS actif ; l’autorisation iPhone reste gérée dans Safari.');
 }
 function filterChanged(){
  if(selected&&!shownDrivers().some(d=>d.id===selected))selected=null;
  render();
 }
 window.sgClientDriverMap={start,stop,filterChanged,shownDrivers};
})();