'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../assets/avis-chauffeurs-test.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
class Node {
 constructor(tag='div'){this.tag=tag;this.children=[];this.hidden=false;this.value='';this.textContent='';
  this.classList={add(){},remove(){}};}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 addEventListener(){}
 setAttribute(){}
}
function setup(){
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,new Node(id));return elements.get(id);};
 const user={id:'client-test'};
 const past=new Date(Date.now()-600000).toISOString();
 const future=new Date(Date.now()+600000).toISOString();
 const ads=['pending','selected','finished','cancelled','expired'].map((id,i)=>({
  id,client_id:user.id,depart_test:'Ville '+i,destination_test:'Quartier '+i,
  statut:'test_en_attente',expire_le:id==='expired'?past:future
 }));
 const choices=['selected','finished','cancelled'].map(id=>({
  id:'choice-'+id,annonce_id:id,client_id:user.id,chauffeur_id:'chauffeur-X',
  statut:id==='selected'?'choisi_test':id==='finished'?'termine_test':'annule_test'
 }));
 let calls=0;
 const ok=data=>({data,error:null});
 const client={
  testRequests:{mine:async()=>{calls++;return ok(ads);}},
  testReplies:{list:async()=>ok([])},
  testChoices:{list:async()=>ok(choices)},
  testReviews:{list:async()=>ok([])},
  testTracking:{list:async()=>ok([])},
  testPayments:{list:async()=>ok([])}
 };
 const window={confirm:()=>true};
 vm.runInNewContext(code,{document:{getElementById:get,createElement:tag=>new Node(tag)},
  window,client,sessionUser:user,driverSimAllowed:false,Date,Intl,Promise,Math,Number,Map,Set});
 return {api:window.sgReviews,get,calls:()=>calls};
}
test('les cinq statuts client sont classes sans données sensibles',async()=>{
 const app=setup();
 await app.api.refreshClient();
 const cards=app.get('sgReviewClientList').children;
 assert.deepEqual(cards.map(c=>c.sgRideStatus),['waiting','active','finished','cancelled','expired']);
 assert.equal(app.calls(),1);
 assert.match(app.get('sgTripsFilterStatus').textContent,/5 simulations affichées sur 5/);
});
test('filtrer Mes courses ne relance pas le serveur et masque les autres cartes',async()=>{
 const app=setup();
 await app.api.refreshClient();
 const select=app.get('sgTripsFilter');
 select.value='finished';
 app.api.filterClient();
 const cards=app.get('sgReviewClientList').children;
 assert.equal(cards.filter(c=>!c.hidden).length,1);
 assert.equal(cards.find(c=>!c.hidden).sgRideStatus,'finished');
 assert.equal(app.calls(),1);
 assert.match(app.get('sgTripsFilterStatus').textContent,/1 simulation affichée sur 5/);
 select.value='all';app.api.filterClient();
 assert.equal(cards.filter(c=>!c.hidden).length,5);
});
test('un filtre inconnu ne masque pas toutes les courses par erreur',async()=>{
 const app=setup();await app.api.refreshClient();
 app.get('sgTripsFilter').value='not-real';
 app.api.filterClient();
 assert.equal(app.get('sgReviewClientList').children.filter(c=>!c.hidden).length,5);
});
test('l interface charge le choix et appelle le filtre local',()=>{
 assert.match(html,/id="sgTripsFilter"/);
 assert.match(html,/window\.sgReviews\.filterClient\(\)/);
 assert.doesNotMatch(code.match(/function filterClient\(\)\{[\s\S]*?\n\}/)?.[0]||'',/\.list\(|\.mine\(|fetch\(/);
});
