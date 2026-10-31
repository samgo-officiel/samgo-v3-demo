'use strict';
// Vérification unitaire hors ligne de l'actualisation SAMGO :
// aucune donnée réelle, aucun compte créé, aucun GPS ni paiement déclenché.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','assets','actualisation-test.js'),'utf8');

function deferred(){
 let resolve;
 const promise=new Promise(r=>{resolve=r;});
 return {promise,resolve};
}
const microtasks=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};

function harness(){
 let route='client';
 let online=true;
 const events=[];
 const status=new Map();
 const user={id:'client-A'};
 const old=deferred(),driver=deferred();
 const calls=[];
 const get=id=>{
  if(!status.has(id)){
   let value='';
   status.set(id,{
    get textContent(){return value;},
    set textContent(v){value=v;events.push({id,value:v});}
   });
  }
  return status.get(id);
 };
 const doc={
  readyState:'loading',visibilityState:'visible',activeElement:null,
  body:{classList:{contains:name=>
   (route==='client'&&name==='sg-route-trips')||
   (route==='driver'&&name==='sg-route-driver')}},
  querySelector:()=>({}),
  getElementById:get,
  addEventListener:()=>{}
 };
 const win={
  addEventListener:()=>{},
  sgDemand:{
   refreshClient:()=>{calls.push('client-demand');return old.promise;},
   refresh:async()=>{calls.push('driver-demand');}
  },
  sgReviews:{refreshDriver:()=>{calls.push('driver-review');return driver.promise;}},
  sgChatTest:{refresh:async side=>{calls.push('chat-'+side);}},
  sgLoyaltyTest:{refresh:async()=>{calls.push('loyalty');}}
 };
 const context={
  window:win,document:doc,sessionUser:user,client:{},
  navigator:{get onLine(){return online;}},
  setInterval:()=>1,Date,Intl,Promise
 };
 vm.runInNewContext(code,context,{filename:'actualisation-test.js'});
 return {
  win,doc,user,old,driver,calls,events,get,
  setRoute:x=>{route=x;},setOnline:x=>{online=x;}
 };
}

test('changement de compte pendant requête lente : ancien chat ignoré et rafraîchissement demandé conservé',async()=>{
 const x=harness();
 const first=x.win.sgRefreshTests.refresh();
 assert.deepEqual(x.calls,['client-demand']);
 x.user.id='driver-B';
 x.setRoute('driver');
 await x.win.sgRefreshTests.refresh(); // le nouveau compte doit être actualisé après A
 assert.deepEqual(x.calls,['client-demand']);
 x.old.resolve();
 await first;
 await microtasks();
 assert.ok(x.calls.includes('driver-review'),'nouvelle actualisation non perdue');
 assert.ok(!x.calls.includes('chat-client'),'ne pas recharger le chat sous un compte différent');
 assert.ok(!x.calls.includes('loyalty'),'ne pas charger la fidélité de l’ancien écran');
 assert.match(x.get('sgRefreshDriverInfo').textContent,/Actualisation des tests en cours/);
 x.driver.resolve();
 await microtasks();
 assert.ok(x.calls.includes('chat-driver'));
 assert.match(x.get('sgRefreshDriverInfo').textContent,/Tests synchronisés/);
});

test('hors connexion : aucun appel au serveur, message explicite',async()=>{
 const x=harness();
 x.setOnline(false);
 await x.win.sgRefreshTests.refresh();
 assert.deepEqual(x.calls,[]);
 assert.match(x.get('sgRefreshClientInfo').textContent,/Hors connexion/);
});

test('onglet masqué : aucune synchronisation automatique du compte',async()=>{
 const x=harness();
 x.doc.visibilityState='hidden';
 await x.win.sgRefreshTests.refresh();
 assert.deepEqual(x.calls,[]);
});
