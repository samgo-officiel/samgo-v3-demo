'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/carte-chaleur-chauffeur-test.js','utf8');
const html=fs.readFileSync('index.html','utf8');
class FakeNode{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.textContent='';this.disabled=false;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
}
function boot({gps,online=true,secure=true,native=null,withLeaflet=true}={}){
 const ids=['sgDriverHotmapStatus','sgDriverHotmapStart','sgDriverHotmapStop','sgDriverHotmapView'];
 const nodes=new Map(ids.map(k=>[k,new FakeNode()]));
 const events={gps:0,map:0,tiles:[],circles:[],setViews:[],removed:0,headLoads:0};
 const mapObj={
  setView(position,zoom){events.setViews.push([position,zoom]);return this;},
  invalidateSize(){},
  remove(){events.removed++}
 };
 const shapes=()=>({addTo(){return this;},bindPopup(){return this;}});
 const L={
  map(){events.map++;return mapObj;},
  circle(latLng,opt){events.circles.push({latLng,opt});return shapes();},
  circleMarker(){return shapes();},
  tileLayer(url,options){events.tiles.push({url,options});return shapes();}
 };
 const window={isSecureContext:secure,Capacitor:native};
 if(withLeaflet)window.L=L;
 const navigator={onLine:online,geolocation:{
  getCurrentPosition(success,error,options){
   events.gps++;
   (gps||((ok)=>ok({coords:{latitude:43.291,longitude:-0.370,accuracy:75}})))(success,error,options);
  }
 }};
 const document={getElementById:id=>nodes.get(id)||null,createElement(tag){return new FakeNode(tag)},head:{
  append(){events.headLoads++;}
 }};
 vm.runInNewContext(source,{window,navigator,document,Promise,Math,Number});
 return {api:window.sgDriverHotmap,events,nodes};
}
test('pas de GPS, de tuiles ou de ressources CDN au chargement initial',()=>{
 const app=boot();
 assert.equal(app.events.gps,0);
 assert.equal(app.events.tiles.length,0);
 assert.equal(app.events.headLoads,0);
 assert.equal(app.events.map,0);
 assert.doesNotMatch(source,/watchPosition|localStorage|sessionStorage|\bfetch\s*\(|console\.log/);
});
test('carte routière avec rue après clic : centre arrondi, 3 concentrations TEST',async()=>{
 const app=boot();
 await app.api.open();
 assert.equal(app.events.gps,1);
 assert.equal(app.events.map,1);
 assert.equal(app.events.tiles[0].url,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
 assert.equal(app.events.setViews[0][0][0],43.3);
 assert.equal(app.events.setViews[0][0][1],-0.4);
 assert.equal(app.events.circles.length,9);
 assert.match(app.nodes.get('sgDriverHotmapStatus').textContent,/demandes entièrement FICTIVES/);
 assert.equal(app.nodes.get('sgDriverHotmapStop').disabled,false);
});
test('les couleurs jaune, orange et rouge correspondent aux trois niveaux fictifs',async()=>{
 const app=boot();await app.api.open();
 const colors=new Set(app.events.circles.map(x=>x.opt.fillColor));
 assert.deepEqual(Array.from(colors).sort(),['#db3828','#ef902a','#ffdf53'].sort());
 const pts=app.api.nearbyDemoPoints({lat:44.8,lng:-0.6});
 assert.deepEqual(Array.from(pts.map(x=>x.count)),[4,9,18]);
 assert.ok(pts.every(x=>x.lat>=-90&&x.lat<=90&&x.lng>=-180&&x.lng<=180));
});
test('GPS refusé : carte d exemple Bordeaux, sans fausse localisation utilisateur',async()=>{
 const app=boot({gps:(_success,error)=>error({code:1,message:'denied'})});
 await app.api.open();
 assert.equal(app.events.setViews[0][0][0],44.8);
 assert.equal(app.events.setViews[0][0][1],-0.6);
 assert.match(app.nodes.get('sgDriverHotmapStatus').textContent,/Exemple Bordeaux/);
});
test('Internet désactivé : ne pas demander GPS',async()=>{
 const app=boot({online:false});
 await app.api.open();
 assert.equal(app.events.gps,0);
 assert.equal(app.events.map,0);
 assert.match(app.nodes.get('sgDriverHotmapStatus').textContent,/hors connexion/);
});
test('réponse GPS invalide : ne pas la présenter comme vraie',async()=>{
 const app=boot({gps:success=>success({coords:{latitude:null,longitude:undefined}})});
 await app.api.open();
 assert.match(app.nodes.get('sgDriverHotmapStatus').textContent,/Exemple Bordeaux/);
 assert.deepEqual(Array.from(app.events.setViews[0][0]),[44.8,-0.6]);
});
test('arrêt pendant permission GPS annule tout futur dessin',async()=>{
 let resolveGps;
 const app=boot({gps:success=>{resolveGps=success;}});
 const running=app.api.open();
 app.api.close();
 resolveGps({coords:{latitude:43.3,longitude:-0.2}});
 await running;
 assert.equal(app.events.map,0);
 assert.match(app.nodes.get('sgDriverHotmapStatus').textContent,/Carte fermée/);
});
test('bouton fermer libère la carte et arrête le mode TEST',async()=>{
 const app=boot();
 await app.api.open();
 app.api.close();
 assert.equal(app.events.removed,1);
 assert.equal(app.nodes.get('sgDriverHotmapView').children.length,0);
 assert.equal(app.nodes.get('sgDriverHotmapStop').disabled,true);
});
test('mode natif Capacitor : une seule demande à la demande, centre arrondi',async()=>{
 let nativeCalls=0;
 const native={isNativePlatform:()=>true,Plugins:{Geolocation:{
  getCurrentPosition:async()=>{nativeCalls++;return {coords:{latitude:48.8566,longitude:2.3522,accuracy:30}};}
 }}};
 const app=boot({native,gps(){throw Error('Browser GPS must not be used')}});
 await app.api.open();
 assert.equal(nativeCalls,1);assert.equal(app.events.gps,0);
 assert.deepEqual(Array.from(app.events.setViews[0][0]),[48.9,2.4]);
});
test('chargement externe épinglé et avertissement de confidentialité visibles dans Chauffeur',()=>{
 assert.match(source,/leaflet@1\.9\.4\/dist\/leaflet/);
 assert.match(source,/integrity='sha256-/);
 assert.match(html,/id="sgDriverHotmapStart"/);
 assert.match(html,/id="sgDriverHotmapView"/);
 assert.match(html,/OpenStreetMap/);
 assert.match(html,/complètement fictives/);
 assert.match(html,/carte-chaleur-chauffeur-test\.js\?v=/);
});
