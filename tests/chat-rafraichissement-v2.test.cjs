'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/messagerie-test.js','utf8');
function boot(){
 const nodes=new Map();
 const get=id=>{
  if(!nodes.has(id))nodes.set(id,makeNode());
  return nodes.get(id);
 };
 function makeNode(){
  return {value:'',disabled:false,textContent:'',className:'',hidden:true,
   children:[],attrs:{},listeners:{},
   replaceChildren(...items){this.children=items;},
   append(...items){this.children.push(...items);},
   setAttribute(k,v){this.attrs[k]=String(v);},
   getAttribute(k){return this.attrs[k]||null;},
   removeAttribute(k){delete this.attrs[k];},
   addEventListener(k,fn){this.listeners[k]=fn;}
  };
 }
 const document={visibilityState:'visible',readyState:'complete',
  body:{classList:{contains:k=>k==='sg-route-trips'}},
  getElementById:get,createElement:makeNode,addEventListener(){}};
 const navigator={onLine:true},user={id:'client-1'};
 let interval=null,ms=0,listCount=0;
 const data={
  testChoices:{list:async()=>({data:[{id:'choice-1',client_id:'client-1',chauffeur_id:'driver-1',statut:'choisi_test'}],error:null})},
  testMessages:{list:async()=>{listCount++;return {data:[],error:null}}}
 };
 const window={};
 vm.runInNewContext(source,{window,document,navigator,sessionUser:user,
  client:data,Date,Intl,Set,Map,Promise,setInterval(fn,duration){interval=fn;ms=duration;}});
 return {chat:window.sgChatTest,document,navigator,user,get,
  tick:()=>interval?.(),count:()=>listCount,ms:()=>ms};
}
test('chat V2 recharge la conversation active toutes les 15 secondes',async()=>{
 const x=boot();
 assert.equal(x.ms(),15000);
 await x.chat.refresh('client');
 assert.equal(x.count(),1);
 await x.tick();
 assert.equal(x.count(),2);
});
test('chat V2 ne consomme pas le serveur en arrière-plan, hors ligne ou sans compte',async()=>{
 const x=boot();await x.chat.refresh('client');
 x.document.visibilityState='hidden';
 await x.tick();assert.equal(x.count(),1);
 x.document.visibilityState='visible';x.navigator.onLine=false;
 await x.tick();assert.equal(x.count(),1);
 x.navigator.onLine=true;
 x.chat.stop();
 await x.tick();assert.equal(x.count(),1);
});
test('chat V2 explique pourquoi les conversations restent inaccessibles',async()=>{
 const x=boot();
 await x.chat.refresh('client');
 assert.match(source,/Une simple annonce ne débloque pas le chat/);
 x.user.id='unknown';
 await x.chat.refresh('client');
 assert.match(x.get('sgChatClientMessages').children[0].textContent,/Aucune conversation TEST/);
});