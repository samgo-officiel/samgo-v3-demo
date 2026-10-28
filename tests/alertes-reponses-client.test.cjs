'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/avis-chauffeurs-test.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
class Node {
 constructor(id){this.id=id;this.textContent='';this.children=[];this.hidden=true;this.value='';
 this.classList={add(){},remove(){}};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(){}
 setAttribute(){}
}
function setup(){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id);};
 const sessionUser={id:'client-A'};
 const replies=[];
 const ok=data=>({data,error:null});
 const data={
  testRequests:{mine:async()=>ok([{id:'ad-1',client_id:sessionUser.id,
   depart_test:'Fictif A',destination_test:'Fictif B',
   statut:'test_en_attente',expire_le:new Date(Date.now()+600000).toISOString()}])},
  testReplies:{list:async()=>ok(replies)},
  testChoices:{list:async()=>ok([])},
  testReviews:{list:async()=>ok([])},
  testTracking:{list:async()=>ok([])},
  testPayments:{list:async()=>ok([])}
 };
 const win={confirm:()=>true};
 vm.runInNewContext(source,{window:win,client:data,sessionUser,driverSimAllowed:false,
  document:{getElementById:get,createElement:tag=>new Node(tag)},Date,Intl,Map,Set,Number,Math,Promise});
 return {api:win.sgReviews,get,replies,sessionUser};
}
test('première lecture ne signale jamais les réponses déjà présentes',async()=>{
 const x=setup();
 x.replies.push({id:'old',annonce_id:'ad-1',chauffeur_id:'driver-1'});
 await x.api.refreshClient();
 assert.equal(x.get('sgClientReplyAlert').hidden,true);
});
test('nouvelle réponse chauffeur affiche une seule alerte fictive',async()=>{
 const x=setup();
 await x.api.refreshClient();
 x.replies.push({id:'reply-1',annonce_id:'ad-1',chauffeur_id:'driver-1'});
 await x.api.refreshClient();
 assert.equal(x.get('sgClientReplyAlert').hidden,false);
 assert.match(x.get('sgClientReplyAlertText').textContent,/1 nouvelle réponse/);
 assert.match(x.get('sgClientReplyAlertText').textContent,/Aucun trajet réel/);
 x.api.dismissReplies();
 assert.equal(x.get('sgClientReplyAlert').hidden,true);
 await x.api.refreshClient();
 assert.equal(x.get('sgClientReplyAlert').hidden,true,'même réponse sans changement');
});
test('déconnexion supprime l’alerte et la comparaison de l’ancien compte',async()=>{
 const x=setup();await x.api.refreshClient();
 x.replies.push({id:'reply-1',annonce_id:'ad-1',chauffeur_id:'driver-1'});
 await x.api.refreshClient();
 assert.equal(x.get('sgClientReplyAlert').hidden,false);
 x.api.clear();
 assert.equal(x.get('sgClientReplyAlert').hidden,true);
 x.sessionUser.id='client-B';
 await x.api.refreshClient();
 assert.equal(x.get('sgClientReplyAlert').hidden,true);
});
test('la bannière ne contient aucun nom, identifiant ou numéro',()=>{
 assert.match(html,/id="sgClientReplyAlert"/);
 assert.match(html,/sgReviews\.dismissReplies\(\)/);
 const match=source.match(/function updateReplyAlerts\([\s\S]*?\n\}/);
 assert.ok(match);
 assert.doesNotMatch(match[0],/client_id|sessionStorage|localStorage|Notification\(/);
});
