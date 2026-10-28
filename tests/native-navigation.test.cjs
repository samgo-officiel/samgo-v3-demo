'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../mobile/native-navigation.js'),'utf8');
function boot(native,menuOpen=false,inHome=false,browserFails=false){
 const calls={listeners:0,home:0,minimize:0,opened:[],stripeRefresh:0,clientRefresh:0};
 let back=null,resume=null,browserFinished=null;
 const linkStatus={textContent:''};
 const menu={
  hidden:!menuOpen,
  hasAttribute(k){return k==='hidden'?this.hidden:false;},
  setAttribute(k){if(k==='hidden')this.hidden=true;}
 };
 const trigger={setAttribute(){}};
 const plugin={addListener(event,callback){
  assert.ok(['backButton','resume'].includes(event));
  calls.listeners++;
  if(event==='backButton')back=callback;
  else resume=callback;
  return Promise.resolve({remove(){}});
 },minimizeApp(){calls.minimize++;}};
 const browser={
  open:({url})=>{
   calls.opened.push(url);
   return browserFails?Promise.reject(new Error('browser unavailable')):Promise.resolve();
  },
  addListener:(event,callback)=>{
   assert.equal(event,'browserFinished');
   browserFinished=callback;
   return Promise.resolve({remove(){}});
  }
 };
 const window={Capacitor:{isNativePlatform:()=>native,Plugins:{App:plugin,Browser:browser}},
  location:{href:'http://localhost/index.html',origin:'http://localhost'},
  sgGo:page=>{assert.equal(page,'home');calls.home++;},
  sgStripeSandbox:{refresh:()=>{calls.stripeRefresh++;}},
  sgDemand:{refreshClient:()=>{calls.clientRefresh++;}}};
 const doc={
  readyState:'complete',addEventListener:(name,callback)=>{if(name==='click')calls.onClick=callback;},
  body:{classList:{contains:value=>value==='sg-home-active'&&inHome}},
  getElementById:id=>id==='sg-menu-panel'?menu:id==='sgNativeLinkStatus'?linkStatus:null,
  querySelector:()=>trigger
 };
 vm.runInNewContext(source,{window,document:doc,Promise,URL});
 return {calls,menu,linkStatus,open:window.sgNativeOpenExternal,
  back:()=>{if(back)back();},resume:()=>{if(resume)resume();},
  browserFinished:()=>{if(browserFinished)browserFinished();}};
}
test('le site web classique n installe pas de listener Android',()=>{
 const x=boot(false);assert.equal(x.calls.listeners,0);
});
test('bouton Retour ferme menu de l app avant de changer d écran',()=>{
 const x=boot(true,true,false);x.back();
 assert.equal(x.menu.hidden,true);
 assert.equal(x.calls.home,0);
 assert.equal(x.calls.minimize,0);
});
test('bouton Retour d un autre écran revient à Accueil',()=>{
 const x=boot(true,false,false);x.back();
 assert.equal(x.calls.home,1);
 assert.equal(x.calls.minimize,0);
});
test('bouton Retour depuis Accueil minimise SAMGO sans vider session',()=>{
 const x=boot(true,false,true);x.back();
 assert.equal(x.calls.minimize,1);
 assert.equal(x.calls.home,0);
});

test('l’application native ouvre HTTPS externe sans quitter sa WebView',()=>{
 const x=boot(true);
 assert.equal(x.open('https://samgo-officiel.github.io/samgo-v3-demo/'),true);
 assert.deepEqual(x.calls.opened,['https://samgo-officiel.github.io/samgo-v3-demo/']);
});
test('refuse les schémas non HTTPS dans le navigateur natif',()=>{
 const x=boot(true);
 for(const link of ['http://example.com','javascript:alert(1)','file:///tmp/test','intent://example.com'])
  assert.equal(x.open(link),false);
 assert.equal(x.calls.opened.length,0);
});
test('le clic sur un lien externe est intercepté sur application native seulement',()=>{
 const x=boot(true);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'https://example.com/aide'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.deepEqual(x.calls.opened,['https://example.com/aide']);
 const web=boot(false);
 assert.equal(web.calls.onClick,undefined);
});
test('un lien relatif de SAMGO ne quitte pas l’application',()=>{
 const x=boot(true);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> './aide.html'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,false);
 assert.equal(x.calls.opened.length,0);
});

test('au retour dans SAMGO les statuts clients et Stripe TEST se mettent a jour sans GPS',()=>{
 const x=boot(true,false,true);
 x.resume();
 assert.equal(x.calls.stripeRefresh,1);
 assert.equal(x.calls.clientRefresh,1);
 assert.equal(x.calls.home,0);
 assert.equal(x.calls.minimize,0);
});
test('le navigateur web ne lance aucun rafraichissement natif au retour',()=>{
 const x=boot(false);
 x.resume();
 assert.equal(x.calls.stripeRefresh,0);
 assert.equal(x.calls.clientRefresh,0);
});

test('une erreur d ouverture du navigateur externe affiche un message sans naviguer',async()=>{
 const app=boot(true,false,true,true);
 assert.equal(app.open('https://example.com'),true);
 await Promise.resolve();await Promise.resolve();
 assert.match(app.linkStatus.textContent,/Impossible d’ouvrir ce lien HTTPS/);
 assert.equal(app.calls.home,0);
});

test('fermer navigateur iOS actualise les statuts sans attendre App.resume',()=>{
 const x=boot(true);
 x.browserFinished();
 assert.equal(x.calls.stripeRefresh,1);
 assert.equal(x.calls.clientRefresh,1);
 // resume survient parfois presque simultanement : pas de requete en double.
 x.resume();
 assert.equal(x.calls.stripeRefresh,1);
 assert.equal(x.calls.clientRefresh,1);
});
