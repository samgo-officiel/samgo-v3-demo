'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../assets/zone-carte-externe-test.js'),'utf8');
function boot({native=false,external=true}={}){
 const opened=[],browser=[],notifications=[];
 const status={textContent:''};
 const win={
  open:(url,target,rel)=>{opened.push({url,target,rel});return external?{}:null;},
  sgNativeOpenExternal:native?url=>{browser.push(url);return true;}:undefined
 };
 const doc={getElementById:id=>id==='sgNearbyStatus'?status:null};
 vm.runInNewContext(script,{window:win,document:doc,Number,Math,encodeURIComponent});
 return {api:win.sgMapsZoneTest,status,opened,browser};
}
test('lien carte n embarque que les coordonnees arrondies',()=>{
 const x=boot();
 const url=x.api.mapsUrl(44.123456,-0.345678);
 const p=new URL(url);
 assert.equal(p.origin,'https://www.google.com');
 assert.equal(p.pathname,'/maps/search/');
 assert.equal(p.searchParams.get('api'),'1');
 assert.equal(p.searchParams.get('query'),'44.12,-0.35');
 assert.ok(!url.includes('44.123456'));
 assert.ok(!url.includes('origin='));
 assert.ok(!url.includes('currentLocation'));
});
test('une coordonnee non valide bloque l ouverture',()=>{
 const x=boot();
 assert.equal(x.api.open(120,3),false);
 assert.equal(x.api.open(null,2),false);
 assert.equal(x.opened.length,0);
 assert.match(x.status.textContent,/invalide/);
});
test('le navigateur externe ne s ouvre qu apres le clic programme',()=>{
 const x=boot();
 assert.equal(x.opened.length,0);
 assert.equal(x.api.open(44.8,-0.5),true);
 assert.equal(x.opened.length,1);
 assert.equal(x.opened[0].target,'_blank');
 assert.equal(x.opened[0].rel,'noopener,noreferrer');
});
test('sur application native, la carte se lance par Capacitor Browser et pas window.open',()=>{
 const x=boot({native:true});
 assert.equal(x.api.open(44.8,-0.5),true);
 assert.equal(x.browser.length,1);
 assert.equal(x.opened.length,0);
});
test('en cas de blocage popup, annonce explicite plutot que succes',()=>{
 const x=boot({external:false});
 assert.equal(x.api.open(44.8,-0.5),false);
 assert.match(x.status.textContent,/bloquée/);
});
test('aucune geolocalisation ou requete externe sans clic',()=>{
 assert.doesNotMatch(script,/getCurrentPosition|watchPosition|fetch\(/);
});
