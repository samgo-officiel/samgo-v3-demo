'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','assets','demandes-geoloc-test.js'),'utf8');
function boot({approved=true,fetchRequests,createReply,online=true,demoRequest=null,nativePosition=undefined}={}){
 const nodes=new Map(),prompts=[];
 class Element {
  constructor(id){this.id=id;this.textContent='';this.value=id==='sgRadius'?'30':'';this.checked=false;this.disabled=true;
   this.hidden=true;this.children=[];this.attrs={};this.listeners={};}
  replaceChildren(){this.children=[];}
  append(...args){this.children.push(...args);}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(type,fn){this.listeners[type]=fn;}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
 const document={getElementById:get,createElement:tag=>new Element(tag),
   addEventListener(){},visibilityState:'visible'};
 const navigator={onLine:online,geolocation:{getCurrentPosition(ok,fail,opts){prompts.push({ok,fail,opts});}}};
 const sessionUser={id:'driver-A'};
 let calls=0,publishCalls=0,nativeCalls=0;
 const client={
  testRequests:{list:async (position,radius)=>{calls++;return fetchRequests?
    fetchRequests(position,radius):{data:[],error:null};},
   create:async()=>{publishCalls++;return {error:null};}},
  testReplies:{list:async()=>({data:[],error:null}),create:(adId,uid)=>createReply?createReply(adId,uid):Promise.resolve({error:null})}
 };
 const window={isSecureContext:true,
  sgMapsZoneTest:{mapsUrl:(lat,lng)=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat+','+lng)}};
 if(nativePosition!==undefined){
  window.Capacitor={isNativePlatform:()=>true,Plugins:{Geolocation:{
   async getCurrentPosition(){
    nativeCalls++;
    if(nativePosition instanceof Error)throw nativePosition;
    return nativePosition;
   }
  }}};
 }
 vm.runInNewContext(source,{
  window,document,navigator,sessionUser,client,driverSimAllowed:approved,localDemoRequest:demoRequest,
  driverTab(){},setInterval(){return 1;},clearInterval(){},Date,Math,Number,
  Intl,Set,Promise,Error,encodeURIComponent
 },{filename:'SAMGO-GPS'});
 return {geo:window.sgDemand,prompts,sessionUser,get,calls:()=>calls,published:()=>publishCalls,nativeCalls:()=>nativeCalls,
  giveGPS:(accuracy=30,measuredAt=Date.now())=>{
   const prompt=prompts.shift();
   assert.ok(prompt,'une demande GPS doit exister');
   prompt.ok({coords:{latitude:48.8566,longitude:2.3522,accuracy},timestamp:measuredAt});
  }};
}
test('permission GPS requise uniquement via action et compte chauffeur approuvé',async()=>{
 const x=boot({approved:false});
 await x.geo.open();
 assert.equal(x.prompts.length,0);
 assert.match(x.get('sgGeoStatus').textContent,/approuvé/i);
});
test('l’arrêt avant la réponse GPS annule les données et les appels serveur',async()=>{
 const x=boot();
 const pending=x.geo.open();
 assert.equal(x.prompts.length,1);
 x.geo.stop();
 x.giveGPS();
 await pending;
 assert.equal(x.calls(),0);
 assert.equal(x.get('sgGeoStop').disabled,true);
});
test('position valable : recherche et précision GPS affichée',async()=>{
 const x=boot();const pending=x.geo.open();
 x.giveGPS(42);
 await pending;
 assert.equal(x.calls(),1);
 assert.match(x.get('sgGeoStatus').textContent,/42 m/);
 assert.equal(x.get('sgGeoStop').disabled,false);
});
test('changer le rayon déclenche une nouvelle recherche',async()=>{
 const x=boot();const pending=x.geo.open();x.giveGPS();await pending;
 x.get('sgRadius').value='50';
 x.geo.radiusChanged();
 await Promise.resolve();await Promise.resolve();
 assert.equal(x.calls(),2);
 assert.equal(x.get('sgRadiusValue').textContent,'50 km');
});
test('le changement de compte invalide la permission GPS en cours',async()=>{
 const x=boot();const pending=x.geo.open();
 x.sessionUser.id='driver-B';
 x.giveGPS();
 await pending;
 assert.equal(x.calls(),0);
});
test('une ancienne mesure GPS ne peut pas être réutilisée',async()=>{
 const x=boot();const pending=x.geo.open();
 x.giveGPS(30,Date.now()-16*60*1000);
 await pending;
 assert.equal(x.calls(),0);
 assert.match(x.get('sgGeoStatus').textContent,/15 minutes/i);
});
test('une position GPS incohérente est rejetée',async()=>{
 const x=boot();const pending=x.geo.open();
 x.prompts.shift().ok({coords:{latitude:220,longitude:3},timestamp:Date.now()});
 await pending;
 assert.equal(x.calls(),0);
 assert.match(x.get('sgGeoStatus').textContent,/invalide/i);
});


test('arrêter le GPS préserve les annonces privées du client',()=>{
 const x=boot();
 x.get('sgMyAdsList').children=[{id:'annonce-client'}];
 x.get('sgMyAdsStatus').textContent='Mes annonces chargées';
 x.geo.stop();
 assert.equal(x.get('sgMyAdsList').children.length,1);
 assert.equal(x.get('sgMyAdsStatus').textContent,'Mes annonces chargées');
});
test('déconnexion ou changement de compte efface les annonces privées',()=>{
 const x=boot();
 x.get('sgMyAdsList').children=[{id:'annonce-client'}];
 x.get('sgMyAdsStatus').textContent='Mes annonces chargées';
 x.geo.stop({clearClient:true});
 assert.equal(x.get('sgMyAdsList').children.length,0);
 assert.match(x.get('sgMyAdsStatus').textContent,/Connectez-vous/);
});

test('une réponse intéressée en retard ne réapparait pas après arrêt GPS et changement de compte',async()=>{
 let resolveReply;
 const replyWait=new Promise(r=>{resolveReply=r;});
 const data=[{
  id:'annonce-1',client_id:'client-fictif',latitude_approx:48.85,longitude_approx:2.35,
  depart_test:'Lieu fictif',destination_test:'Maison fictive',distance_km:7,tarif_indicatif:7
 }];
 const x=boot({fetchRequests:async()=>({data,error:null}),createReply:()=>replyWait});
 const initial=x.geo.open();x.giveGPS();await initial;
 const card=x.get('sgNearbyList').children[0];
 assert.ok(card,'l’annonce doit être visible avant envoi');
 const btn=card.children.find(v=>v.listeners?.click);
 assert.ok(btn,'le bouton intéressé doit exister');
 const old=btn.listeners.click();
 x.geo.stop({clearClient:true});
 x.sessionUser.id='driver-B';
 resolveReply({error:null});
 await old;
 assert.equal(x.get('sgNearbyList').children.length,0);
 assert.doesNotMatch(x.get('sgNearbyStatus').textContent,/Réponse de test enregistrée/);
});
test('une ancienne erreur de recherche GPS ne remplace pas la vue du nouveau compte',async()=>{
 let rejectFetch,signalStarted;
 const started=new Promise(resolve=>{signalStarted=resolve;});
 const waiting=new Promise((resolve,reject)=>{rejectFetch=reject;});
 const x=boot({fetchRequests:async()=>{signalStarted();return waiting;}});
 const initial=x.geo.open();x.giveGPS();
 // Attendre que la recherche asynchrone existe vraiment avant de la rejeter.
 await started;
 x.geo.stop({clearClient:true});
 x.sessionUser.id='driver-B';
 rejectFetch(Error('erreur de l’ancien compte'));
 await initial;
 assert.doesNotMatch(x.get('sgNearbyStatus').textContent,/erreur de l’ancien compte/);
});

test('le lien carte approximative ne se déclenche pas automatiquement',async()=>{
 const req={
  id:'map-test',client_id:'client-X',latitude_approx:48.85,longitude_approx:2.35,
  depart_test:'Lieu fictif',destination_test:'Maison fictive',distance_km:4,tarif_indicatif:4
 };
 const x=boot({fetchRequests:async()=>({data:[req],error:null})});
 const pending=x.geo.open();x.giveGPS();await pending;
 const card=x.get('sgNearbyList').children[0];
 assert.ok(card,'Annonce avec zone fictive attendue');
 const link=card.children.find(n=>n.id==='a');
 assert.ok(link,'lien carte externe absent');
 assert.match(link.href,/google\.com\/maps\/search/);
 assert.equal(link.target,'_blank');
 assert.equal(link.rel,'noopener noreferrer');
 assert.equal(link.listeners.click,undefined,'aucun lien programmatique ne doit partir automatiquement');
});

test('tri chauffeur : proximité, tarif indicatif ou trajet le plus court',()=>{
 const x=boot();
 const rows=[
  {id:'a',approach:2,distance_km:9,tarif_indicatif:15},
  {id:'b',approach:6,distance_km:4,tarif_indicatif:40},
  {id:'c',approach:3,distance_km:2,tarif_indicatif:25}
 ];
 const ids=mode=>x.geo.sortRequests(rows,mode).map(r=>r.id).join(',');
 assert.equal(ids('proximite'),'a,c,b');
 assert.equal(ids('tarif'),'b,c,a');
 assert.equal(ids('trajet'),'c,b,a');
 assert.equal(ids('inconnu'),'a,c,b');
 assert.equal(rows[0].id,'a','le tri ne doit pas modifier les résultats bruts');
});
test('changer le tri local ne sollicite ni GPS ni lecture serveur',()=>{
 const x=boot();
 const select=x.get('sgDemandSort');
 select.value='tarif';
 x.geo.sortChanged();
 assert.equal(x.prompts.length,0);
 assert.equal(x.calls(),0);
});

test('hors connexion : publication fictive bloquée avant demande GPS',async()=>{
 const x=boot({online:false});
 await x.geo.publish();
 assert.equal(x.prompts.length,0);
 assert.match(x.get('sgPublishStatus').textContent,/Hors connexion/);
});

test('GPS chauffeur trop imprécis au-delà de 5 km : aucune annonce recherchée',async()=>{
 const x=boot();
 const pending=x.geo.open();
 x.giveGPS(8500);
 await pending;
 assert.equal(x.calls(),0);
 assert.match(x.get('sgGeoStatus').textContent,/trop imprécise/);
 assert.match(x.get('sgGeoStatus').textContent,/8500 m/);
 assert.equal(x.get('sgGeoStop').disabled,true);
});
test('GPS client trop imprécis : publication réellement bloquée avant appel serveur',async()=>{
 const x=boot({demoRequest:{from:'Centre-ville fictif',to:'Quartier fictif',km:5}});
 x.get('sgPublishConsent').checked=true;
 const pending=x.geo.publish();
 assert.equal(x.prompts.length,1,'permission GPS demandée seulement après clic volontaire');
 x.giveGPS(8000);
 await pending;
 assert.equal(x.published(),0);
 assert.match(x.get('sgPublishStatus').textContent,/trop imprécise/);
 assert.equal(x.get('sgPublishBtn').disabled,false);
});

test('Android et iPhone natifs : la localisation ne demarre jamais avant le clic',async()=>{
 const x=boot({nativePosition:{coords:{latitude:48.86,longitude:2.35,accuracy:80},timestamp:Date.now()}});
 assert.equal(x.nativeCalls(),0);
 await x.geo.open();
 assert.equal(x.nativeCalls(),1);
 assert.equal(x.prompts.length,0,'pas de double permission navigateur');
 assert.equal(x.calls(),1,'uniquement une recherche de demandes fictives');
 assert.match(x.get('sgGeoStatus').textContent,/GPS actif/);
});
test('le GPS natif refuse produit un message clair sans appel serveur',async()=>{
 const x=boot({nativePosition:new Error('location permission denied')});
 await x.geo.open();
 assert.equal(x.nativeCalls(),1);
 assert.equal(x.calls(),0);
 assert.match(x.get('sgGeoStatus').textContent,/Localisation refusée/);
});
test('publier une demande fictive utilise le GPS natif une seule fois',async()=>{
 const x=boot({
  demoRequest:{from:'Fictif centre',to:'Fictif maison',km:5},
  nativePosition:{coords:{latitude:44.83,longitude:-0.56,accuracy:75},timestamp:Date.now()}
 });
 x.get('sgPublishConsent').checked=true;
 await x.geo.publish();
 assert.equal(x.nativeCalls(),1);
 assert.equal(x.prompts.length,0);
 assert.equal(x.published(),1);
 assert.match(x.get('sgPublishStatus').textContent,/publiée/);
});
