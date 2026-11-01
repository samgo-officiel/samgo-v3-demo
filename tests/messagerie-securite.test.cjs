'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','assets','messagerie-test.js'),'utf8');

class Node{
 constructor(id){this.id=id;this.value='';this.disabled=false;this.textContent='';this.className='';
  this.children=[];this.attrs={};this.listeners={};this.hidden=true;}
 replaceChildren(...values){this.children=values;}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(name,value){this.attrs[name]=String(value);}
 getAttribute(name){return this.attrs[name]||null;}
 removeAttribute(name){delete this.attrs[name];}
 addEventListener(name,fn){this.listeners[name]=fn;}
}
function boot({online=true}={}){
 const nodes=new Map(),get=id=>{
  if(!nodes.has(id))nodes.set(id,new Node(id));
  return nodes.get(id);
 };
 const document={getElementById:get,createElement:tag=>new Node(tag),
  addEventListener(){},readyState:'loading'};
 const user={id:'A'};
 const rows={
  A:[{id:'cA',client_id:'A',chauffeur_id:'X',statut:'choisi_test'},
     {id:'cA2',client_id:'A',chauffeur_id:'Y',statut:'choisi_test'}],
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
  Intl,Date,Promise,navigator:{onLine:online}},{filename:'SAMGO-chat'});
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

test('hors connexion : envoyer garde le brouillon et ne crée pas de message distant',async()=>{
 const app=boot({online:false});
 await app.chat.refresh('client');
 app.get('sgChatClientInput').value='Brouillon non envoyé';
 await app.chat.send('client');
 assert.equal(app.created.length,0);
 assert.equal(app.get('sgChatClientInput').value,'Brouillon non envoyé');
 assert.match(app.get('sgChatClientStatus').textContent,/Hors connexion/);
});

test('une arrivée affiche une alerte discrète sans contenu du message',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.messages.push({id:'m1',auteur_id:'X',contenu:'Message privé fictif',cree_le:'2026-10-28T12:00:00Z'});
 await app.chat.refresh('client');
 assert.equal(app.get('sgChatNewToast').hidden,false);
 assert.equal(app.get('sgChatNewToast').getAttribute('data-role'),'client');
 assert.doesNotMatch(app.get('sgChatNewText').textContent,/Message privé fictif/);
 app.chat.dismissNotice();
 assert.equal(app.get('sgChatNewToast').hidden,true);
});
test('déconnexion cache et désassocie la notification du compte',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.messages.push({id:'m1',auteur_id:'X',contenu:'TEST',cree_le:'2026-10-28T12:00:00Z'});
 await app.chat.refresh('client');
 assert.equal(app.get('sgChatNewToast').hidden,false);
 app.chat.stop();
 assert.equal(app.get('sgChatNewToast').hidden,true);
 assert.equal(app.get('sgChatNewToast').getAttribute('data-role'),null);
});

test('chaque conversation conserve son brouillon local séparé',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 const input=app.get('sgChatClientInput');
 input.value='Brouillon pour le chauffeur X';
 const choices=app.get('sgChatClientChoices').children;
 assert.equal(choices.length,2);
 choices[1].listeners.click();
 assert.equal(input.value,'','ne pas réutiliser le texte X dans le chat Y');
 input.value='Brouillon pour le chauffeur Y';
 app.get('sgChatClientChoices').children[0].listeners.click();
 assert.equal(input.value,'Brouillon pour le chauffeur X');
 app.get('sgChatClientChoices').children[1].listeners.click();
 assert.equal(input.value,'Brouillon pour le chauffeur Y');
});
test('la déconnexion efface les brouillons de chaque conversation',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 const input=app.get('sgChatClientInput');
 input.value='Texte confidentiel de test';
 app.get('sgChatClientChoices').children[1].listeners.click();
 input.value='Autre texte de test';
 app.chat.stop();
 assert.equal(input.value,'');
 await app.chat.refresh('client');
 assert.equal(input.value,'','aucun brouillon de l ancien utilisateur ne doit revenir');
 app.get('sgChatClientChoices').children[1].listeners.click();
 assert.equal(input.value,'');
});
test('réponse tardive après changement de chat ne détruit pas son brouillon',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 const input=app.get('sgChatClientInput');
 input.value='Message du chat X';
 const pending=app.chat.send('client');
 app.get('sgChatClientChoices').children[1].listeners.click();
 input.value='Texte du chat Y encore à envoyer';
 app.finish({error:null});
 await pending;
 assert.equal(input.value,'Texte du chat Y encore à envoyer');
 app.get('sgChatClientChoices').children[0].listeners.click();
 assert.equal(input.value,'Message du chat X');
});


test('ouvrir une conversation affiche le dernier message sans bloquer la lecture des anciens',async()=>{
 const app=boot();
 const box=app.get('sgChatClientMessages');
 box.scrollHeight=1200;box.clientHeight=300;box.scrollTop=0;
 await app.chat.refresh('client');
 assert.equal(box.scrollTop,1200,'un premier affichage doit présenter les messages récents');
 box.scrollTop=100;
 await app.chat.refresh('client');
 assert.equal(box.scrollTop,100,'l actualisation ne déplace pas une personne qui lit de vieux messages');
 await app.get('sgChatClientChoices').children[1].listeners.click();
 assert.equal(box.scrollTop,1200,'changer de conversation revient aux messages récents');
});
test('une actualisation près du bas reste près du dernier message',async()=>{
 const app=boot();
 const box=app.get('sgChatClientMessages');
 box.scrollHeight=1000;box.clientHeight=300;box.scrollTop=680;
 await app.chat.refresh('client');
 box.scrollTop=680;
 await app.chat.refresh('client');
 assert.equal(box.scrollTop,1000);
});

test('4G incertaine : ne pas affirmer qu un message a été refusé, garder le brouillon',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.get('sgChatClientInput').value='Message de test sur réseau lent';
 const sending=app.chat.send('client');
 app.finish({error:Object.assign(new Error('Failed to fetch'),{name:'TypeError'})});
 await sending;
 assert.equal(app.get('sgChatClientInput').value,'Message de test sur réseau lent');
 assert.match(app.get('sgChatClientStatus').textContent,/Envoi non confirmé/);
 assert.match(app.get('sgChatClientStatus').textContent,/doublon/);
});
test('refus HTTP 403 : ne pas suggérer que le message aurait pu arriver',async()=>{
 const app=boot();
 await app.chat.refresh('client');
 app.get('sgChatClientInput').value='Message interdit';
 const sending=app.chat.send('client');
 app.finish({error:Object.assign(new Error('Forbidden'),{status:403})});
 await sending;
 assert.match(app.get('sgChatClientStatus').textContent,/Envoi refusé par le serveur/);
 assert.doesNotMatch(app.get('sgChatClientStatus').textContent,/peut-être reçu/);
});
