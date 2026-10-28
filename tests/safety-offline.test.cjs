'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');
const offline=fs.readFileSync(path.join(__dirname,'../hors-ligne.html'),'utf8');
const safety=fs.readFileSync(path.join(__dirname,'../securite.html'),'utf8');
function setup(){
 const handlers={},added=[],scope='https://samgo-officiel.github.io/samgo-v3-demo/';
 const safetyUrl=scope+'securite.html',offlineUrl=scope+'hors-ligne.html';
 const safetyReply={type:'safety'},offlineReply={type:'offline'};
 const cache={
  async add(req){added.push(req.url);},
  async match(url){return url===safetyUrl?safetyReply:url===offlineUrl?offlineReply:null;}
 };
 const self={
  registration:{scope},
  clients:{claim:async()=>{}},
  skipWaiting:async()=>{},
  addEventListener:(event,fn)=>{handlers[event]=fn;}
 };
 const caches={open:async()=>cache,keys:async()=>[],delete:async()=>true};
 class Request{constructor(url){this.url=url;}}
 class Response{constructor(text){this.text=text;}}
 vm.runInNewContext(source,{self,caches,Request,Response,URL,Promise,fetch:async()=>{throw Error('offline');}});
 return {handlers,added,safetyUrl,offlineUrl,
  install(){let done;handlers.install({waitUntil:task=>{done=task;}});return done;},
  fetch(request){let promise;handlers.fetch({request,respondWith:task=>{promise=task;}});return promise;}
 };
}
test('mise en cache seulement des deux pages statiques, aucune API ni compte',async()=>{
 const app=setup();
 await app.install();
 assert.equal(app.added.length,2);
 assert.ok(app.added.includes(app.offlineUrl));
 assert.ok(app.added.includes(app.safetyUrl));
 assert.ok(!app.added.some(url=>/messages|token|compte|auth\/v1|rest\/v1/.test(url)));
});
test('page sécurité reste lisible hors connexion, sans échange de données',async()=>{
 const app=setup();
 const page=await app.fetch({method:'GET',mode:'navigate',url:app.safetyUrl});
 assert.equal(page.type,'safety');
 assert.match(safety,/tel:112/);
});
test('autres navigations utilisent la page neutre hors ligne, pas les données privées',async()=>{
 const app=setup();
 const page=await app.fetch({method:'GET',mode:'navigate',url:app.offlineUrl});
 assert.equal(page.type,'offline');
 assert.match(offline,/href="\.\/securite\.html"/);
});
test('les requêtes API, les POST et les autres origines ne sont pas interceptées',()=>{
 const app=setup();
 assert.equal(app.fetch({method:'POST',mode:'navigate',url:app.safetyUrl}),undefined);
 assert.equal(app.fetch({method:'GET',mode:'cors',url:app.safetyUrl}),undefined);
 assert.equal(app.fetch({method:'GET',mode:'navigate',url:'https://autre.example/'}),undefined);
});
