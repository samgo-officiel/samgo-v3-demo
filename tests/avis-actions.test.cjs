'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','assets','avis-chauffeurs-test.js'),'utf8');
class Node {
 constructor(id){this.id=id;this.children=[];this.textContent='';this.listeners={};
  this.className='';this.disabled=false;this.value='';this.isConnected=true;
  this.classList={add(){},remove(){}};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 addEventListener(event,callback){this.listeners[event]=callback;}
 setAttribute(){}
}
function boot(){
 const elements=new Map();
 const get=id=>{
  if(!elements.has(id))elements.set(id,new Node(id));
  return elements.get(id);
 };
 const doc={getElementById:get,createElement:tag=>new Node(tag)};
 const user={id:'client-A'};
 let requests=0,resolver=null,failReads=false,chatLoads=0;
 const ad={id:'ad-1',client_id:'client-A',depart_test:'Ville fictive',
  destination_test:'Maison fictive',expire_le:new Date(Date.now()+3600000).toISOString(),
  statut:'test_en_attente'};
 const reply={id:'reply-1',annonce_id:'ad-1',chauffeur_id:'driver-B'};
 const requestsClient={
  mine:async()=>failReads?{error:Error('réseau indisponible')}:{data:[ad],error:null}
 };
 const data={
  testRequests:requestsClient,
  testReplies:{list:async()=>({data:[reply],error:null})},
  testChoices:{
   list:async()=>({data:[],error:null}),
   choose:()=>{requests++;return new Promise(resolve=>{resolver=resolve;});}
  },
  testReviews:{list:async()=>({data:[],error:null})},
  testTracking:{list:async()=>({data:[],error:null})},
  testPayments:{list:async()=>({data:[],error:null})}
 };
 const win={confirm:()=>true,sgChatTest:{refresh:async role=>{
  assert.equal(role,'client');chatLoads++;
 }}};
 vm.runInNewContext(source,{window:win,document:doc,client:data,sessionUser:user,
  driverSimAllowed:false,Date,Intl,Map,Set,Number,Math,Promise},
  {filename:'SAMGO-reviews'});
 const selectButton=()=>{
  const cards=get('sgReviewClientList').children;
  assert.ok(cards.length,'Une annonce devrait être affichée');
  const btn=cards[0].children.find(node=>node.textContent?.includes('Choisir chauffeur'));
  assert.ok(btn,'Bouton de sélection introuvable');
  return btn;
 };
 return {get,user,api:win.sgReviews,selectButton,
  requests:()=>requests,chatLoads:()=>chatLoads,
  finish:result=>{assert.ok(resolver);resolver(result);},
  failReads:()=>{failReads=true;}};
}
test('choix de chauffeur : double clic n’envoie qu’une seule sélection',async()=>{
 const x=boot();
 await x.api.refreshClient();
 const button=x.selectButton();
 const a=button.listeners.click();
 const b=button.listeners.click();
 assert.equal(x.requests(),1);
 x.finish({error:null});
 await Promise.all([a,b]);
 assert.match(x.get('sgReviewClientStatus').textContent,/Chauffeur sélectionné/);
 assert.match(x.get('sgReviewClientStatus').textContent,/messagerie TEST est disponible/);
 assert.equal(x.chatLoads(),1,'le chat client doit s’ouvrir aussitôt que le chauffeur est choisi');
});
test('ancien choix de chauffeur ne remplace pas le statut après déconnexion',async()=>{
 const x=boot();
 await x.api.refreshClient();
 const pending=x.selectButton().listeners.click();
 x.api.clear();
 x.user.id='client-C';
 x.get('sgReviewClientStatus').textContent='Compte différent connecté';
 x.finish({error:null});
 await pending;
 assert.equal(x.get('sgReviewClientStatus').textContent,'Compte différent connecté');
 assert.equal(x.get('sgReviewClientList').children.length,0);
 assert.equal(x.chatLoads(),0,'une réponse tardive ne doit pas ouvrir le chat du mauvais compte');
});
test('en cas de panne réseau, garder les anciennes annonces affichées',async()=>{
 const x=boot();
 await x.api.refreshClient();
 assert.equal(x.get('sgReviewClientList').children.length,1);
 x.failReads();
 await x.api.refreshClient();
 assert.equal(x.get('sgReviewClientList').children.length,1);
 assert.match(x.get('sgReviewClientStatus').textContent,/Chargement impossible/);
});

test('les lectures client déjà chargées sont réutilisées même si une nouvelle lecture échouerait',async()=>{
 const x=boot();
 x.failReads();
 const snapshot={
  uid:'client-A',
  ads:[{id:'ad-1',client_id:'client-A',depart_test:'Lieu fictif A',
   destination_test:'Lieu fictif B',
   expire_le:new Date(Date.now()+3600000).toISOString(),statut:'test_en_attente'}],
  replies:[{id:'reply-1',annonce_id:'ad-1',chauffeur_id:'driver-B'}],
  choices:[]
 };
 await x.api.refreshClient(snapshot);
 assert.equal(x.get('sgReviewClientList').children.length,1);
 assert.match(x.get('sgReviewClientStatus').textContent,/annonce\(s\) consultée/);
 assert.ok(x.selectButton(),'la réponse chauffeur doit rester sélectionnable');
});
