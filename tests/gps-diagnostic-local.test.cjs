'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('assets/gps-diagnostic-local-test.js','utf8');
const html=fs.readFileSync('index.html','utf8');

function boot({geolocation,secure=true,userAgent='iPhone',capacitor}={}){
 const calls=[],nodes=new Map([
  ['sgGpsLocalRun',{disabled:false}],
  ['sgGpsLocalStatus',{textContent:'GPS non testé.'}]
 ]);
 const navigator={userAgent};
 if(geolocation)navigator.geolocation={
  getCurrentPosition(resolve,reject,options){
   calls.push(options);
   geolocation(resolve,reject,options);
  }
 };
 const window={isSecureContext:secure};
 if(capacitor)window.Capacitor=capacitor;
 const document={getElementById:id=>nodes.get(id)||null};
 vm.runInNewContext(src,{window,navigator,document,Promise});
 return {run:()=>window.sgGpsLocalTest.run(),nodes,calls};
}
function status(app){return app.nodes.get('sgGpsLocalStatus').textContent;}

test('le GPS ne demande aucune permission automatiquement au chargement',()=>{
 const app=boot({geolocation() {throw new Error('GPS must not run before click');}});
 assert.equal(app.calls.length,0);
 assert.match(status(app),/non testé/);
 assert.doesNotMatch(src,/fetch\(|localStorage|sessionStorage|console\.log/);
});
test('sans compte le diagnostic détecte une position, mais ne révèle pas les coordonnées',async()=>{
 const app=boot({geolocation(resolve){
  resolve({coords:{latitude:43.2951,longitude:-0.3708,accuracy:65}});
 }});
 await app.run();
 assert.equal(app.calls.length,1);
 assert.equal(app.calls[0].maximumAge,0);
 assert.match(status(app),/GPS détecté/);
 assert.match(status(app),/65 m/);
 assert.doesNotMatch(status(app),/43\.2951|-0\.3708/);
 assert.equal(app.nodes.get('sgGpsLocalRun').disabled,false);
});
test('GPS refusé : message de réglages iPhone, sans afficher de faux succès',async()=>{
 const app=boot({geolocation(_resolve,reject){
  reject({code:1,message:'User denied Geolocation'});
 }});
 await app.run();
 assert.match(status(app),/Localisation refusée/);
 assert.match(status(app),/iPhone|Safari/);
 assert.doesNotMatch(status(app),/GPS détecté/);
});
test('GPS Android refusé : instructions du navigateur ou téléphone',async()=>{
 const app=boot({userAgent:'Android Chrome',geolocation(_resolve,reject){reject({code:1});}});
 await app.run();
 assert.match(status(app),/réglages du navigateur ou de votre téléphone/);
});
test('position non disponible et délai dépassé donnent deux consignes distinctes',async()=>{
 const unavailable=boot({geolocation(_r,reject){reject({code:2});}});
 const timeout=boot({geolocation(_r,reject){reject({code:3});}});
 await unavailable.run(); await timeout.run();
 assert.match(status(unavailable),/Position introuvable/);
 assert.match(status(timeout),/trop longtemps/);
});
test('aucun accès GPS en contexte HTTP non sécurisé',async()=>{
 const app=boot({secure:false,geolocation(){throw new Error('must not call GPS');}});
 await app.run();
 assert.match(status(app),/HTTPS/);
 assert.equal(app.calls.length,0);
});
test('position GPS vide ou hors limites rejetée au lieu de valider 0,0',async()=>{
 for(const coords of [{latitude:null,longitude:null,accuracy:12},{latitude:400,longitude:2,accuracy:10}]){
  const app=boot({geolocation(resolve){resolve({coords});}});
  await app.run();
  assert.doesNotMatch(status(app),/GPS détecté/);
  assert.match(status(app),/Impossible de lire la position/);
 }
});
test('une localisation imprécise demande la précision GPS sans prétendre afficher des demandes',async()=>{
 const app=boot({geolocation(resolve){resolve({coords:{latitude:43,longitude:-1,accuracy:9000}});}});
 await app.run();
 assert.match(status(app),/trop approximative/);
 assert.match(status(app),/localisation précise/);
});
test('deux clics simultanés ne demandent qu une seule position',async()=>{
 let finish;
 const app=boot({geolocation(resolve){finish=resolve;}});
 const first=app.run();
 await app.run();
 assert.equal(app.calls.length,1);
 assert.equal(app.nodes.get('sgGpsLocalRun').disabled,true);
 finish({coords:{latitude:42,longitude:1,accuracy:25}});
 await first;
 assert.equal(app.nodes.get('sgGpsLocalRun').disabled,false);
});
test('en natif Capacitor : GPS de l app utilisé sans consulter le navigateur',async()=>{
 let asked=0;
 const capacitor={isNativePlatform:()=>true,Plugins:{Geolocation:{
  getCurrentPosition:async options=>{asked++;assert.equal(options.timeout,15000);
   return {coords:{latitude:44,longitude:2,accuracy:19}};}
 }}};
 const app=boot({secure:false,capacitor,geolocation(){throw Error('browser GPS must not be used');}});
 await app.run();
 assert.equal(asked,1);
 assert.equal(app.calls.length,0);
 assert.match(status(app),/GPS détecté/);
});
test('bouton local présent sur Compte et raccourci depuis Accueil',()=>{
 assert.match(html,/id="sgGpsLocalRun"/);
 assert.match(html,/id="sgGpsLocalStatus"/);
 assert.match(html,/onclick="window\.sgGpsLocalTest\.run\(\)"/);
 assert.match(html,/gps-diagnostic-local-test\.js\?v=\d{8}-/);
 assert.match(html,/Tester mon GPS sans compte \(TEST\)/);
});
