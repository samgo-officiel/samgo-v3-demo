'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','assets','stripe-sandbox-connexion.js'),'utf8');
function boot(native=false){
 const elements=new Map(),opened=[],sent=[],external=[],qrShown=[],qrClosed=[];
 const get=id=>{
  if(!elements.has(id))elements.set(id,{textContent:'',disabled:false,hidden:true});
  return elements.get(id);
 };
 const user={id:'driver-1'};
 const requests=[],waiters=new Map();
 const fakeFetch=(endpoint,options)=>new Promise(resolve=>{
  const action=JSON.parse(options.body).action;
  requests.push({action,resolve});
  const notify=waiters.get(action);
  if(notify){waiters.delete(action);notify();}
 });
 const waitFor=action=>requests.some(x=>x.action===action)
  ?Promise.resolve():new Promise(resolve=>waiters.set(action,resolve));
 const client={auth:{async getAccessToken(){return 'token-test';}}};
 const window={
  location:{search:'',assign:url=>opened.push(url)},
  confirm(){return true;},
  sgStripeQrTest:{show(url){qrShown.push(url);},close(){qrClosed.push(true);}},
  ...(native?{sgNativeOpenExternal:url=>{external.push(url);return true;}}:{})
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
 return {api:window.sgStripeSandbox,user,opened,external,qrShown,qrClosed,get,reply,requests,waitFor,sent};
}
test('onboarding Stripe de TEST tardif ignoré après changement de compte',async()=>{
 const x=boot();
 const promise=x.api.onboardDriver();
 await x.waitFor('onboard_driver');
 x.user.id='driver-2';x.api.reset();
 x.reply('onboard_driver',{sandbox:true,url:'https://connect.stripe.com/test'});
 await promise;
 assert.equal(x.opened.length,0,'aucun lien de l’ancien compte ne doit s’ouvrir');
 assert.match(x.get('sgStripeSandboxDriverButton').textContent,/Configurer mon compte/);
});
test('checkout Stripe de TEST tardif ignoré après déconnexion',async()=>{
 const x=boot();
 const promise=x.api.checkout('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 await x.waitFor('checkout');
 x.api.reset();
 x.reply('checkout',{sandbox:true,url:'https://checkout.stripe.com/test'});
 await promise;
 assert.equal(x.opened.length,0);
});
test('statut Stripe de l’ancien compte non rendu sur le nouveau compte',async()=>{
 const x=boot();
 const pending=x.api.refresh();
 await x.waitFor('status');
 x.user.id='driver-2';x.api.reset();
 x.reply('status',{configured:true});
 await pending;
 assert.match(x.get('sgStripeSandboxClientStatus').textContent,/Connectez-vous/);
 assert.doesNotMatch(x.get('sgStripeSandboxDriverStatus').textContent,/disponible/);
});
test('onboarding explicitement demandé fonctionne en TEST avec compte inchangé',async()=>{
 const x=boot();
 const pending=x.api.onboardDriver();
 await x.waitFor('onboard_driver');
 x.reply('onboard_driver',{sandbox:true,url:'https://connect.stripe.com/test'});
 await pending;
 assert.deepEqual(x.opened,['https://connect.stripe.com/test']);
});

test('Stripe TEST sur Android natif utilise navigateur externe sans quitter SAMGO',async()=>{
 const x=boot(true);
 const pending=x.api.onboardDriver();
 await x.waitFor('onboard_driver');
 x.reply('onboard_driver',{sandbox:true,url:'https://connect.stripe.com/test'});
 await pending;
 assert.deepEqual(x.external,['https://connect.stripe.com/test']);
 assert.deepEqual(x.opened,[]);
});
test('checkout Stripe TEST montre un QR sur le téléphone, sans ouvrir automatiquement le navigateur',async()=>{
 const x=boot(true);
 const pending=x.api.checkout('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
 await x.waitFor('checkout');
 x.reply('checkout',{sandbox:true,url:'https://checkout.stripe.com/c/pay/cs_test_12345'});
 await pending;
 assert.deepEqual(x.qrShown,['https://checkout.stripe.com/c/pay/cs_test_12345']);
 assert.deepEqual(x.external,[],'Le navigateur externe ne s ouvre que sur clic du client dans le QR');
 assert.deepEqual(x.opened,[]);
 x.api.reset();
 assert.equal(x.qrClosed.length,1,'La déconnexion ferme le QR');
});

test('un double clic ne déclenche qu une demande Checkout TEST et une seule fenêtre QR',async()=>{
 const x=boot();
 const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 const first=x.api.checkout(id);
 await x.waitFor('checkout');
 await x.api.checkout(id);
 assert.equal(x.requests.filter(r=>r.action==='checkout').length,1);
 assert.match(x.get('sgStripeSandboxClientStatus').textContent,/déjà en préparation/);
 x.reply('checkout',{sandbox:true,url:'https://checkout.stripe.com/c/pay/cs_test_12345'});
 await first;
 assert.equal(x.qrShown.length,1);
 // Après réponse serveur, un nouvel essai explicite doit rester possible.
 const again=x.api.checkout(id);
 await x.waitFor('checkout');
 assert.equal(x.requests.filter(r=>r.action==='checkout').length,1);
 x.reply('checkout',{sandbox:true,url:'https://checkout.stripe.com/c/pay/cs_test_12345'});
 await again;
 assert.equal(x.qrShown.length,2);
});
test('une déconnexion réinitialise le verrou Checkout et ignore la réponse de l ancien compte',async()=>{
 const x=boot();
 const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 const first=x.api.checkout(id);
 await x.waitFor('checkout');
 x.user.id='driver-2';x.api.reset();
 const second=x.api.checkout(id);
 // L'obtention asynchrone du jeton doit finir avant de compter les requêtes.
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(x.requests.filter(r=>r.action==='checkout').length,2);
 x.reply('checkout',{sandbox:true,url:'https://checkout.stripe.com/c/pay/cs_test_11111'});
 await first;
 assert.equal(x.qrShown.length,0);
 x.reply('checkout',{sandbox:true,url:'https://checkout.stripe.com/c/pay/cs_test_22222'});
 await second;
 assert.deepEqual(x.qrShown,['https://checkout.stripe.com/c/pay/cs_test_22222']);
});
