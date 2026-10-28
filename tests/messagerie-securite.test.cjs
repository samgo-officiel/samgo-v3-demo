'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','assets','messagerie-test.js'),'utf8');

class Node{
 constructor(id){this.id=id;this.value='';this.disabled=false;this.textContent='';this.className='';
  this.children=[];this.attrs={};this.listeners={};}
 replaceChildren(...values){this.children=values;}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(name,value){this.attrs[name]=String(value);}
 addEventListener(name,fn){this.listeners[name]=fn;}
}
function boot(){
 const nodes=new Map(),get=id=>{
  if(!nodes.has(id))nodes.set(id,new Node(id));
  return nodes.get(id);
 };
 const document={getElementById:get,createElement:tag=>new Node(tag),
  addEventListener(){},readyState:'loading'};
 const user={id:'A'};
 const rows={
  A:[{id:'cA',client_id:'A',chauffeur_id:'X',statut:'choisi_test'}],
  B:[{id:'cB',client_id:'B',chauffeur_id:'Y',statut:'choisi_test'}]
 };
 let settle=null;
 const created=[];
 const messages=[];
 const data={
  testChoices:{async list(){return {data:rows[user.id]||[],error:null};}},
  testMessages:{
   async list(){return {data:messages.slice(),error:null};},
   create(choiceId,uid,body){
    created.push({choiceId,uid,body});
    return new Promise(resolve=>{settle=resolve;});
   }
  }
 };
 const win={};
 vm.runInNewContext(source,{document,window:win,sessionUser:user,client:data,
  Intl,Date,Promise},{filename:'SAMGO-chat'});
 return {chat:win.sgChatTest,get,user,created,messages,
  finish:value=>{assert.ok(settle);settle(value);}};
}
test('après changement de compte, un ancien envoi ne vide pas la nouvelle rédaction',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.get('sgChatClientInput').value='Message ancien';
 const inflight=app.chat.send('client');
 app.user.id='B';
 await app.chat.refresh('client');
 app.get('sgChatClientInput').value='Brouillon du compte B';
 app.finish({error:null});
 await inflight;
 assert.equal(app.get('sgChatClientInput').value,'Brouillon du compte B');
 assert.equal(app.created[0].uid,'A');
 assert.equal(app.created[0].choiceId,'cA');
 assert.equal(app.get('sgChatClientSend').disabled,false);
});
test('un envoi tardif après déconnexion ne fait réapparaître aucun message privé',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.get('sgChatClientInput').value='Un message fictif';
 const inflight=app.chat.send('client');
 app.chat.stop();
 app.finish({error:null});
 await inflight;
 assert.equal(app.get('sgChatClientInput').value,'');
 assert.equal(app.get('sgChatClientSend').disabled,true);
 assert.match(app.get('sgChatClientStatus').textContent,/TEST/);
});
test('une erreur de l’ancien compte ne remplace pas le statut du nouveau',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.get('sgChatClientInput').value='Échec ancien';
 const inflight=app.chat.send('client');
 app.user.id='B';
 await app.chat.refresh('client');
 app.finish({error:new Error('ancienne erreur')});
 await inflight;
 assert.doesNotMatch(app.get('sgChatClientStatus').textContent,/ancienne erreur/);
});

test('nouveau message entrant dans un chat déjà ouvert déclenche le signal TEST',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 assert.doesNotMatch(app.get('sgChatClientStatus').textContent,/Nouveau message/);
 app.messages.push({id:'m1',auteur_id:'X',contenu:'Bonjour (TEST)',cree_le:'2026-10-28T12:00:00Z'});
 await app.chat.refresh('client');
 assert.match(app.get('sgChatClientStatus').textContent,/Nouveau message de TEST/);
 await app.chat.refresh('client');
 assert.doesNotMatch(app.get('sgChatClientStatus').textContent,/Nouveau message de TEST/);
});
test('première lecture et messages que l utilisateur écrit ne déclenchent pas de faux signal',async()=>{
 const app=boot();
 app.messages.push({id:'m1',auteur_id:'X',contenu:'Ancien test',cree_le:'2026-10-28T12:00:00Z'});
 await app.chat.refresh('client');
 assert.doesNotMatch(app.get('sgChatClientStatus').textContent,/Nouveau message/);
 app.messages.push({id:'m2',auteur_id:'A',contenu:'Moi (TEST)',cree_le:'2026-10-28T12:01:00Z'});
 await app.chat.refresh('client');
 assert.doesNotMatch(app.get('sgChatClientStatus').textContent,/Nouveau message/);
});
test('déconnexion purge le signal des messages du précédent compte',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.messages.push({id:'m1',auteur_id:'X',contenu:'Message ancien',cree_le:'2026-10-28T12:00:00Z'});
 await app.chat.refresh('client');
 assert.match(app.get('sgChatClientStatus').textContent,/Nouveau message/);
 app.chat.stop();
 app.user.id='B';
 await app.chat.refresh('client');
 assert.doesNotMatch(app.get('sgChatClientStatus').textContent,/Nouveau message/);
});
