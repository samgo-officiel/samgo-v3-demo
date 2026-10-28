'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','assets','stripe-sandbox-connexion.js'),'utf8');
function boot(){
 const elements=new Map(),opened=[],sent=[];
 const get=id=>{
  if(!elements.has(id))elements.set(id,{textContent:'',disabled:false,hidden:true});
  return elements.get(id);
 };
 const user={id:'driver-1'};
 const requests=[];
 const fakeFetch=(endpoint,options)=>new Promise(resolve=>{
  const action=JSON.parse(options.body).action;
  requests.push({action,resolve});
 });
 const client={auth:{async getAccessToken(){return 'token-test';}}};
 const window={
  location:{search:'',assign:url=>opened.push(url)},
  confirm(){return true;}
 };
 const document={getElementById:get,readyState:'loading',addEventListener(){}};
 vm.runInNewContext(source,{window,document,sessionUser:user,client,
  driverSimAllowed:true,PUBLISHABLE_KEY:'sb_publishable_test',fetch:fakeFetch,URLSearchParams});
 const reply=(action,value)=>{
  const index=requests.findIndex(x=>x.action===action);
  assert.notEqual(index,-1,'requête attendue: '+action);
  requests.splice(index,1)[0].resolve({
   ok:true,json:async()=>value
  });
 };
 return {api:window.sgStripeSandbox,user,opened,get,reply,requests,sent};
}
test('onboarding Stripe de TEST tardif ignoré après changement de compte',async()=>{
 const x=boot();
 const promise=x.api.onboardDriver();
 await Promise.resolve();await Promise.resolve();
 x.user.id='driver-2';x.api.reset();
 x.reply('onboard_driver',{sandbox:true,url:'https://connect.stripe.com/test'});
 await promise;
 assert.equal(x.opened.length,0,'aucun lien de l’ancien compte ne doit s’ouvrir');
 assert.match(x.get('sgStripeSandboxDriverButton').textContent,/Configurer mon compte/);
});
test('checkout Stripe de TEST tardif ignoré après déconnexion',async()=>{
 const x=boot();
 const promise=x.api.checkout('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 await Promise.resolve();await Promise.resolve();
 x.api.reset();
 x.reply('checkout',{sandbox:true,url:'https://checkout.stripe.com/test'});
 await promise;
 assert.equal(x.opened.length,0);
});
test('statut Stripe de l’ancien compte non rendu sur le nouveau compte',async()=>{
 const x=boot();
 const pending=x.api.refresh();
 await Promise.resolve();await Promise.resolve();
 x.user.id='driver-2';x.api.reset();
 x.reply('status',{configured:true});
 await pending;
 assert.match(x.get('sgStripeSandboxClientStatus').textContent,/Connectez-vous/);
 assert.doesNotMatch(x.get('sgStripeSandboxDriverStatus').textContent,/disponible/);
});
test('onboarding explicitement demandé fonctionne en TEST avec compte inchangé',async()=>{
 const x=boot();
 const pending=x.api.onboardDriver();
 await Promise.resolve();await Promise.resolve();
 x.reply('onboard_driver',{sandbox:true,url:'https://connect.stripe.com/test'});
 await pending;
 assert.deepEqual(x.opened,['https://connect.stripe.com/test']);
});
