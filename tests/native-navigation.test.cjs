'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../mobile/native-navigation.js'),'utf8');
function boot(native,menuOpen=false,inHome=false,browserFails=false,chatOpen=false,qrOpen=false,browserAvailable=true,appAvailable=true){
 const calls={listeners:0,home:0,minimize:0,opened:[],stripeRefresh:0,clientRefresh:0,chatBack:0,qrClose:0};
 let chatVisible=chatOpen,qrVisible=qrOpen;
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
 const window={Capacitor:{isNativePlatform:()=>native,Plugins:{...(appAvailable?{App:plugin}:{}),...(browserAvailable?{Browser:browser}:{})}},
  location:{href:'http://localhost/index.html',origin:'http://localhost'},
  sgGo:page=>{assert.equal(page,'home');calls.home++;},
  sgChatPage:{
   isOpen:()=>chatVisible,
   back:()=>{calls.chatBack++;chatVisible=false;}
  },
  sgStripeQrTest:{
   isOpen:()=>qrVisible,
   close:()=>{calls.qrClose++;qrVisible=false;}
  },
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
test('Retour ferme le QR Stripe TEST avant la messagerie et le menu',()=>{
 const x=boot(true,true,false,false,true,true);
 x.back();
 assert.equal(x.calls.qrClose,1);
 assert.equal(x.calls.chatBack,0);
 assert.equal(x.calls.home,0);
 assert.equal(x.menu.hidden,false);
 x.back();
 assert.equal(x.calls.chatBack,1);
 assert.equal(x.calls.home,0);
});
test('bouton Retour Android ferme d abord la messagerie plein écran',()=>{
 const x=boot(true,true,false,false,true);
 x.back();
 assert.equal(x.calls.chatBack,1);
 assert.equal(x.calls.home,0);
 assert.equal(x.calls.minimize,0);
 assert.equal(x.menu.hidden,false,'le menu derrière le chat ne doit pas intercepter Retour');
 x.back();
 assert.equal(x.menu.hidden,true,'ensuite Retour ferme le menu');
 assert.equal(x.calls.home,0);
 x.back();
 assert.equal(x.calls.home,1,'puis Retour revient à Accueil');
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
test('refuse les URL HTTPS contenant des identifiants intégrés',()=>{
 const x=boot(true);
 for(const link of ['https://user:secret@example.com/path','https://user@example.com/','https://:secret@example.com/'])
  assert.equal(x.open(link),false,'identifiants dans une URL interdits');
 assert.equal(x.calls.opened.length,0);
 assert.equal(x.open('https://example.com/safe'),true);
 assert.deepEqual(x.calls.opened,['https://example.com/safe']);
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
test('navigateur externe manquant : le lien HTTPS ne sort jamais de la WebView',()=>{
 const x=boot(true,false,false,false,false,false,false);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'https://example.com/externe'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.equal(x.calls.opened.length,0);
 assert.match(x.linkStatus.textContent,/navigateur externe est indisponible/);
});
test('un lien HTTP externe est bloqué, sans navigation ni fuite de session',()=>{
 const x=boot(true);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'http://example.com/risque'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.equal(x.calls.opened.length,0);
 assert.match(x.linkStatus.textContent,/non sécurisé bloqué/);
});
test('le numéro d urgence tel reste géré par le téléphone',()=>{
 const x=boot(true);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'tel:112'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,false);
 assert.equal(x.calls.opened.length,0);
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

test('un clic HTTPS avec identifiants est bloqué avec un message de sécurité explicite',()=>{
 const x=boot(true);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'https://client:secret@example.com/aide'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.equal(x.calls.opened.length,0);
 assert.match(x.linkStatus.textContent,/identifiants intégrés/);
 assert.doesNotMatch(x.linkStatus.textContent,/indisponible/);
});

test('clic sur un noeud texte dans un lien externe : la WebView ne navigue pas',()=>{
 const x=boot(true);
 let prevented=false;
 const anchor={getAttribute:()=> 'https://example.com/externe'};
 const element={closest:()=>anchor};
 x.calls.onClick({
  defaultPrevented:false,
  target:{nodeType:3,parentElement:element},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.deepEqual(x.calls.opened,['https://example.com/externe']);
});

test('URL de meme origine avec identifiants : interdite meme si l origine est SAMGO',()=>{
 const x=boot(true);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'http://user:secret@localhost/index.html'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.equal(x.calls.opened.length,0);
 assert.match(x.linkStatus.textContent,/identifiants intégrés/);
});


test('href malforme : navigation native bloquee avec message explicite',()=>{
 const x=boot(true);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'https://[adresse-invalide'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.equal(x.calls.opened.length,0);
 assert.match(x.linkStatus.textContent,/Lien invalide bloqué/);
});

test('lien malforme : aucun clic natif ne declenche de navigation externe',()=>{
 const x=boot(true);
 for(const href of ['http://[', 'https://[::invalid]', 'https://%']){
  let prevented=false;
  x.calls.onClick({
   defaultPrevented:false,
   target:{closest:()=>({getAttribute:()=>href})},
   preventDefault(){prevented=true;}
  });
  assert.equal(prevented,true,href);
 }
 assert.equal(x.calls.opened.length,0);
});


test('les caracteres de controle dans les URL externes sont rejetes avant normalisation',()=>{
 const x=boot(true);
 for(const href of ['https://exa\nmple.com/path','https://example.com/\tadmin','https://example.com/\u0000'])
  assert.equal(x.open(href),false,'URL de controle refusee');
 assert.equal(x.calls.opened.length,0);
});

test('clic natif avec retour ligne dans href : refuse sans navigateur externe',()=>{
 const x=boot(true);
 let prevented=false;
 x.calls.onClick({
  defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'https://exa\nmple.com/path'})},
  preventDefault(){prevented=true;}
 });
 assert.equal(prevented,true);
 assert.equal(x.calls.opened.length,0);
 assert.match(x.linkStatus.textContent,/Lien invalide bloqué/);
});

test('refuse les URL HTTPS avec espaces exterieurs avant normalisation',()=>{
 const x=boot(true);
 for(const href of [' https://example.com/path','https://example.com/path ','\t https://example.com']){
  assert.equal(x.open(href),false,JSON.stringify(href));
  let prevented=false;
  x.calls.onClick({
   defaultPrevented:false,
   target:{closest:()=>({getAttribute:()=>href})},
   preventDefault(){prevented=true;}
  });
  assert.equal(prevented,true,JSON.stringify(href));
 }
 assert.equal(x.calls.opened.length,0);
 assert.match(x.linkStatus.textContent,/Lien invalide bloqué/);
});


test('sans plugin App, les liens externes restent proteges dans la WebView native',()=>{
 const x=boot(true,false,false,false,false,false,true,false);
 assert.equal(x.calls.listeners,0);
 assert.equal(typeof x.calls.onClick,'function');
 let prevented=false;
 x.calls.onClick({defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'https://example.com/assistance'})},
  preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
 assert.deepEqual(x.calls.opened,['https://example.com/assistance']);
});

test('sans plugins App ni Browser, les liens externes sont bloques sans fuite WebView',()=>{
 const x=boot(true,false,false,false,false,false,false,false);
 let prevented=false;
 x.calls.onClick({defaultPrevented:false,
  target:{closest:()=>({getAttribute:()=> 'https://example.com/externe'})},
  preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
 assert.equal(x.calls.opened.length,0);
 assert.match(x.linkStatus.textContent,/navigateur externe est indisponible/);
});
