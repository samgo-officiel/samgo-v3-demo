'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('assets/carte-chauffeurs-client-test.js','utf8');
const html=fs.readFileSync('index.html','utf8');
class Node{
 constructor(tag='div'){this.tag=tag;this.children=[];this.events={};this.disabled=false;this.checked=false;this.value='';this.textContent='';this.attributes={};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(name,callback){this.events[name]=callback;}
}
function boot({gps,secure=true,capacitor}={}){
 const ids=['sgClientMapStart','sgClientMapStop','sgClientMapStatus','sgClientMapRadar',
  'sgClientMapProfiles','sgClientMapRadius','sgClientMapAvailableOnly'];
 const nodes=new Map(ids.map(x=>[x,new Node()]));
 nodes.get('sgClientMapRadius').value='10';
 const calls=[];
 const navigator={geolocation:{getCurrentPosition(resolve,reject,options){
  calls.push(options);
  (gps||((done)=>done({coords:{latitude:43.1,longitude:-0.2,accuracy:100}})))(resolve,reject,options);
 }}};
 const document={getElementById:id=>nodes.get(id)||null,createElement:tag=>new Node(tag),
  createElementNS:(ns,tag)=>new Node(tag)};
 const window={isSecureContext:secure,Capacitor:capacitor||null};
 vm.runInNewContext(script,{navigator,document,window,Promise,Number,Math});
 return {api:window.sgClientDriverMap,nodes,calls,read:id=>nodes.get(id).textContent};
}
test('affichage client absent avant un clic GPS et aucune requête réseau',()=>{
 const app=boot();
 assert.equal(app.calls.length,0);
 assert.equal(app.nodes.get('sgClientMapRadar').children.length,0);
 assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|watchPosition|console\.log/);
});
test('après autorisation GPS, 3 profils DEMO à 10 km et aucune coordonnée affichée',async()=>{
 const app=boot();
 await app.api.start();
 assert.equal(app.calls.length,1);
 assert.equal(app.calls[0].enableHighAccuracy,true);
 assert.equal(app.nodes.get('sgClientMapProfiles').children.length,3);
 assert.match(app.read('sgClientMapStatus'),/3 chauffeur\(s\) TEST/);
 assert.match(app.read('sgClientMapStatus'),/aucun chauffeur réel/);
 assert.doesNotMatch(app.read('sgClientMapStatus'),/43\.1|-0\.2/);
 assert.equal(app.nodes.get('sgClientMapRadar').children.length,1);
 assert.equal(app.nodes.get('sgClientMapStop').disabled,false);
});
test('filtres 5, 10, 30 km et disponibilités fictives',async()=>{
 const app=boot();
 await app.api.start();
 app.nodes.get('sgClientMapRadius').value='5';app.api.filterChanged();
 assert.equal(app.nodes.get('sgClientMapProfiles').children.length,2);
 app.nodes.get('sgClientMapAvailableOnly').checked=true;app.api.filterChanged();
 assert.equal(app.nodes.get('sgClientMapProfiles').children.length,1);
 app.nodes.get('sgClientMapRadius').value='30';app.api.filterChanged();
 assert.equal(app.nodes.get('sgClientMapProfiles').children.length,3);
});
test('choix d un profil DEMO n envoie aucune demande de réservation',async()=>{
 const app=boot();await app.api.start();
 const row=app.nodes.get('sgClientMapProfiles').children[0];
 const button=row.children[2];
 assert.equal(button.disabled,false);
 button.events.click();
 assert.match(app.read('sgClientMapStatus'),/Aucun chauffeur n’a été contacté/);
 assert.equal(app.calls.length,1);
});
test('position refusée: aucun marqueur fictif affiché',async()=>{
 const app=boot({gps:(_success,reject)=>reject({code:1})});
 await app.api.start();
 assert.match(app.read('sgClientMapStatus'),/GPS refusé/);
 assert.equal(app.nodes.get('sgClientMapRadar').children.length,0);
 assert.equal(app.nodes.get('sgClientMapProfiles').children.length,0);
});
test('réponse GPS vide ou impossible ne crée pas de faux centre',async()=>{
 for(const coords of [{latitude:null,longitude:0},{latitude:91,longitude:-2}]){
  const app=boot({gps:resolve=>resolve({coords})});
  await app.api.start();
  assert.equal(app.nodes.get('sgClientMapRadar').children.length,0);
  assert.doesNotMatch(app.read('sgClientMapStatus'),/chauffeur\(s\) TEST/);
 }
});
test('stop efface les profils et ignore une réponse GPS arrivée après arrêt',async()=>{
 let finish;
 const app=boot({gps:resolve=>{finish=resolve;}});
 const waiting=app.api.start();
 assert.equal(app.nodes.get('sgClientMapStart').disabled,true);
 app.api.stop();
 finish({coords:{latitude:43.1,longitude:-0.2,accuracy:25}});
 await waiting;
 assert.equal(app.nodes.get('sgClientMapRadar').children.length,0);
 assert.match(app.read('sgClientMapStatus'),/Carte fictive effacée/);
 assert.equal(app.nodes.get('sgClientMapStart').disabled,false);
});
test('application native utilise GPS Capacitor avec consentement au clic',async()=>{
 let called=0;
 const capacitor={isNativePlatform:()=>true,Plugins:{Geolocation:{
  getCurrentPosition:async opts=>{called++;assert.equal(opts.maximumAge,0);
   return {coords:{latitude:43.1,longitude:-0.2,accuracy:80}};}
 }}};
 const app=boot({secure:false,capacitor,gps(){throw Error('Browser geolocation called');}});
 await app.api.start();
 assert.equal(called,1);assert.equal(app.calls.length,0);
 assert.match(app.read('sgClientMapStatus'),/3 chauffeur\(s\) TEST/);
});
test('la carte DEMO est clairement intégrée à Réserver et non à une réservation réelle',()=>{
 assert.match(html,/id="sgClientDriverMap"/);
 assert.match(html,/id="sgClientMapRadar"/);
 assert.match(html,/window\.sgClientDriverMap\.start\(\)/);
 assert.match(html,/window\.sgClientDriverMap\.stop\(\)/);
 assert.match(html,/carte-chauffeurs-client-test\.js\?v=/);
 assert.match(html,/tous les profils et leurs distances sont inventés/);
});
