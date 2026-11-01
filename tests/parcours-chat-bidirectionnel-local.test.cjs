'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('assets/essai-reservation-chat-local.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const live=fs.readFileSync('assets/messagerie-test.js','utf8');
function environment(){
 const nodes=new Map();
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const element={
   id,disabled:false,value:'',textContent:'',className:'',scrollTop:0,scrollHeight:100,
   children:[],listeners:{},
   append(...items){this.children.push(...items);},
   appendChild(item){this.children.push(item);},
   replaceChildren(...items){this.children=[...items];},
   addEventListener(name,callback){this.listeners[name]=callback;}
  };
  nodes.set(id,element);return element;
 }
 const document={
  readyState:'complete',getElementById:node,
  createElement(tag){return {tag,textContent:'',className:'',children:[],
   append(...items){this.children.push(...items);},
   appendChild(item){this.children.push(item);}}}
 };
 const window={};
 vm.runInNewContext(source,{window,document}, {timeout:1000});
 return {api:window.sgRideChatDemo,node};
}
test('réservation TEST : demande puis acceptation puis fin du trajet, sans serveur',()=>{
 const {api,node}=environment();
 assert.equal(api.snapshot().stage,'idle');
 assert.equal(node('sgRideChatDemoClientSend').disabled,true);
 assert.equal(api.accept(),false);
 assert.equal(api.start(),true);
 assert.equal(api.snapshot().stage,'requested');
 assert.equal(node('sgRideChatDemoAccept').disabled,false);
 assert.equal(api.sendClient(),false);
 assert.equal(api.accept(),true);
 assert.equal(node('sgRideChatDemoClientSend').disabled,false);
 assert.equal(api.complete(),true);
 assert.equal(api.snapshot().stage,'completed');
 assert.equal(api.sendDriver(),false);
 assert.equal(node('sgRideChatDemoDriverSend').disabled,true);
});
test('message client transmis en vue chauffeur, puis réponse chauffeur en vue client',()=>{
 const {api,node}=environment();
 api.start();api.accept();
 node('sgRideChatDemoClientInput').value='Bonjour, je suis devant le cinéma (fictif)';
 assert.equal(api.sendClient(),true);
 let snap=api.snapshot();
 assert.equal(snap.count,1);
 assert.equal(snap.messages[0].sender,'client');
 assert.equal(node('sgRideChatDemoClientInput').value,'');
 assert.equal(node('sgRideChatDemoDriverLog').children[0].children[0].textContent,'Client — reçu (simulation)');
 assert.equal(node('sgRideChatDemoDriverLog').children[0].children[1].textContent,snap.messages[0].message);
 node('sgRideChatDemoDriverInput').value='J’arrive dans 5 minutes (simulation)';
 assert.equal(api.sendDriver(),true);
 snap=api.snapshot();
 assert.equal(snap.count,2);
 assert.equal(node('sgRideChatDemoClientLog').children[1].children[0].textContent,'Chauffeur — reçu (simulation)');
 assert.equal(node('sgRideChatDemoClientLog').children[1].children[1].textContent,snap.messages[1].message);
 assert.match(node('sgRideChatDemoStatus').textContent,/reçu dans la vue client/);
});
test('aucun envoi vide ou de plus de 500 caractères',()=>{
 const {api,node}=environment();
 api.start();api.accept();
 node('sgRideChatDemoClientInput').value='    ';
 assert.equal(api.sendClient(),false);
 node('sgRideChatDemoClientInput').value='a'.repeat(501);
 assert.equal(api.sendClient(),false);
 assert.equal(api.snapshot().count,0);
});
test('messages non rendus avec innerHTML : aucun risque de balise HTML injectée',()=>{
 const {api,node}=environment();
 api.start();api.accept();
 node('sgRideChatDemoClientInput').value='<img src=x onerror=alert(1)>';
 assert.equal(api.sendClient(),true);
 const view=node('sgRideChatDemoDriverLog').children[0].children[1];
 assert.equal(view.textContent,'<img src=x onerror=alert(1)>');
 assert.equal(Object.hasOwn(view,'innerHTML'),false);
 assert.doesNotMatch(source,/\.innerHTML\s*=/);
});
test('recommencer efface tout et coupe les deux chats',()=>{
 const {api,node}=environment();
 api.start();api.accept();
 node('sgRideChatDemoClientInput').value='Coucou';
 assert.equal(api.sendClient(),true);
 api.reset();
 assert.equal(api.snapshot().count,0);
 assert.equal(api.snapshot().stage,'idle');
 assert.equal(node('sgRideChatDemoClientSend').disabled,true);
 assert.equal(node('sgRideChatDemoDriverSend').disabled,true);
 assert.equal(node('sgRideChatDemoDriverLog').children.length,1);
});
test('parcours visible dans Mes courses, explicitement local et sans vraie réservation',()=>{
 assert.match(html,/id="sgRideChatDemoPanel"/);
 assert.match(html,/window\.sgRideChatDemo\.start\(\)/);
 assert.match(html,/window\.sgRideChatDemo\.accept\(\)/);
 assert.match(html,/window\.sgRideChatDemo\.sendClient\(\)/);
 assert.match(html,/window\.sgRideChatDemo\.sendDriver\(\)/);
 assert.match(html,/window\.sgRideChatDemo\.complete\(\)/);
 assert.match(html,/essai-reservation-chat-local\.js\?v=/);
 assert.match(html,/aucune réservation réelle/i);
 assert.doesNotMatch(source,/\bfetch\(|\.from\(|\bsessionStorage\b|\blocalStorage\b|\bsetInterval\(/);
});
test('la messagerie connectée relit au retour de Safari et quand Internet revient',()=>{
 assert.match(live,/document\.addEventListener\('visibilitychange'/);
 assert.match(live,/window\.addEventListener\('online'/);
 assert.match(live,/setInterval\(pollActiveConversation,15000\)/);
 assert.match(live,/client\.testMessages\.create\(choiceId,uid,text\)/);
 assert.match(live,/client\.testMessages\.list\(choice\)/);
});
