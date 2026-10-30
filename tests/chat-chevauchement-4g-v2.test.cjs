'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/messagerie-test.js','utf8');
const reply=(data=[])=>({data,error:null});
function boot(){
 const elements=new Map();
 const make=()=>({value:'',textContent:'',className:'',hidden:true,disabled:false,children:[],attrs:{},listeners:{},
  replaceChildren(...xs){this.children=xs;},append(...xs){this.children.push(...xs);},
  setAttribute(n,v){this.attrs[n]=String(v);},getAttribute(n){return this.attrs[n]||null;},
  removeAttribute(n){delete this.attrs[n];},addEventListener(n,fn){this.listeners[n]=fn;}});
 const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id);};
 const document={readyState:'complete',visibilityState:'visible',
  body:{classList:{contains:c=>c==='sg-route-trips'}},
  createElement:make,getElementById:get,addEventListener(){}};
 const user={id:'client-A'};
 const choices=[{id:'choice-1',client_id:'client-A',chauffeur_id:'driver-B',statut:'choisi_test'}];
 let choicesCalls=0,reads=0,pending=null,currentMessages=[];
 const backend={
  testChoices:{async list(){choicesCalls++;return reply(choices);}},
  testMessages:{
   list(){
    reads++;
    if(pending&&reads===2)return pending.promise;
    return Promise.resolve(reply(currentMessages));
   },
   async create(id,author,text){
    currentMessages.push({id:'message-new',choix_id:id,auteur_id:author,contenu:text,
     cree_le:'2026-10-30T01:00:00.000Z'});
    return {error:null};
   }
  }
 };
 let tick=null;
 const window={};
 vm.runInNewContext(source,{window,document,sessionUser:user,client:backend,
  navigator:{onLine:true},setInterval:fn=>{tick=fn;},Date,Intl,Promise,Map,Set});
 return {chat:window.sgChatTest,get,user,choices,
  delayed(){
   let resolve;const promise=new Promise(ok=>resolve=ok);
   pending={promise,resolve};
  },
  resolveDelayed(data){pending.resolve(reply(data));},
  reads:()=>reads,choicesCalls:()=>choicesCalls,tick:()=>tick()};
}
test('les deux sondages chat ne dupliquent pas une requête lente de la même conversation',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.delayed();
 const first=app.tick();
 await app.tick();
 await app.tick();
 assert.equal(app.reads(),2,'un seul appel doit être en cours même sur 4G lente');
 const refresh=app.chat.refresh('client');
 await refresh;
 assert.equal(app.choicesCalls(),2);
 app.resolveDelayed([{id:'late-1',choix_id:'choice-1',auteur_id:'driver-B',
  contenu:'Message lent reçu',cree_le:'2026-10-30T01:00:00.000Z'}]);
 await first;
 assert.match(app.get('sgChatClientStatus').textContent,/Nouveau message|message\(s\) de TEST/);
 assert.match(app.get('sgChatClientMessages').children[0].children[1].textContent,/Message lent reçu/);
 await app.tick();
 assert.equal(app.reads(),3,'le polling doit pouvoir reprendre après la réponse');
});
test('une déconnexion pendant une lecture lente ne réaffiche pas les anciens messages',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.delayed();
 const first=app.tick();
 app.chat.stop();
 app.resolveDelayed([{id:'private',choix_id:'choice-1',auteur_id:'driver-B',
  contenu:'Ancien contenu confidentiel',cree_le:'2026-10-30T01:00:00.000Z'}]);
 await first;
 assert.doesNotMatch(app.get('sgChatClientMessages').children[0].textContent,/confidentiel/);
 assert.match(app.get('sgChatClientStatus').textContent,/TEST/);
});
test('un envoi terminé force une nouvelle lecture, sans laisser la lecture lente écraser le message',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.delayed();
 const first=app.tick();
 app.get('sgChatClientInput').value='Mon message TEST';
 await app.chat.send('client');
 assert.equal(app.reads(),3,'les messages doivent être relus directement après l’envoi');
 assert.match(app.get('sgChatClientMessages').children[0].children[1].textContent,/Mon message TEST/);
 app.resolveDelayed([{id:'stale',choix_id:'choice-1',auteur_id:'driver-B',
  contenu:'Ancien message du serveur',cree_le:'2026-10-30T01:00:00.000Z'}]);
 await first;
 assert.match(app.get('sgChatClientMessages').children[0].children[1].textContent,/Mon message TEST/);
});