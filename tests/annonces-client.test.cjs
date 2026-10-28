'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','assets','demandes-geoloc-test.js'),'utf8');
class Node{
 constructor(id){this.id=id;this.children=[];this.textContent='';this.value='30';
 this.disabled=false;this.hidden=true;this.listeners={};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(type,fn){this.listeners[type]=fn;}
 setAttribute(){}
}
function start(){
 const elements=new Map(),get=id=>{
  if(!elements.has(id))elements.set(id,new Node(id));
  return elements.get(id);
 };
 const user={id:'client-A'};
 let mineCalls=0,request=null;
 const currentAd={id:'ad-1',depart_test:'Lieu A',destination_test:'Lieu B',
  expire_le:new Date(Date.now()+1000000).toISOString(),statut:'test_en_attente',
  distance_km:5};
 const client={
  testRequests:{mine:()=>{mineCalls++;return request?request():Promise.resolve({data:[currentAd],error:null});}},
  testReplies:{list:async()=>({data:[],error:null})},
  testChoices:{list:async()=>({data:[],error:null})}
 };
 const doc={getElementById:get,createElement:tag=>new Node(tag),
  visibilityState:'visible',addEventListener(){}};
 const window={isSecureContext:true,sgProximityMap:{clear(){}}};
 vm.runInNewContext(source,{window,document:doc,sessionUser:user,client,
  driverSimAllowed:false,navigator:{},Date,Intl,Math,Number,Promise,Set},
  {filename:'SAMGO-test-ads'});
 return {api:window.sgDemand,get,user,setMine:fn=>{request=fn;},calls:()=>mineCalls};
}
test('annonces conservées après une erreur temporaire de réseau',async()=>{
 const app=start();await app.api.refreshClient();
 assert.equal(app.get('sgMyAdsList').children.length,1);
 app.setMine(async()=>({error:new Error('réseau indisponible')}));
 await app.api.refreshClient();
 assert.equal(app.get('sgMyAdsList').children.length,1);
 assert.match(app.get('sgMyAdsStatus').textContent,/Impossible de consulter/);
});
test('une liste confirmée vide efface les vieilles annonces',async()=>{
 const app=start();await app.api.refreshClient();
 app.setMine(async()=>({data:[],error:null}));
 await app.api.refreshClient();
 assert.equal(app.get('sgMyAdsList').children.length,0);
 assert.match(app.get('sgMyAdsStatus').textContent,/Aucune annonce/);
});
test('déconnexion efface les annonces privées du client',async()=>{
 const app=start();await app.api.refreshClient();
 app.api.stop({clearClient:true});
 assert.equal(app.get('sgMyAdsList').children.length,0);
});

test('une annonce client indique le temps approximatif avant expiration',async()=>{
 const app=start();
 await app.api.refreshClient();
 const card=app.get('sgMyAdsList').children[0];
 const info=card.children[1].textContent;
 assert.match(info,/Active \(test\), expire dans environ/);
 assert.match(info,/réponse\(s\) de chauffeurs/);
});
test('durée restante : minutes et heures sans valeur négative',()=>{
 const app=start(),now=Date.now();
 assert.equal(app.api.remainingTime(now+5*60000,now),'expire dans environ 5 min');
 assert.equal(app.api.remainingTime(now+75*60000,now),'expire dans environ 1 h 15 min');
 assert.equal(app.api.remainingTime(now-1000,now),'expirée');
 assert.equal(app.api.remainingTime(NaN,now),'expirée');
});
