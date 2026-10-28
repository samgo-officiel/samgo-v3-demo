'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../mobile/native-navigation.js'),'utf8');
function boot(native,menuOpen=false,inHome=false){
 const calls={listeners:0,home:0,minimize:0};
 let back=null;
 const menu={
  hidden:!menuOpen,
  hasAttribute(k){return k==='hidden'?this.hidden:false;},
  setAttribute(k){if(k==='hidden')this.hidden=true;}
 };
 const trigger={setAttribute(){}};
 const plugin={addListener(event,callback){
  assert.equal(event,'backButton');calls.listeners++;back=callback;return Promise.resolve({remove(){}});
 },minimizeApp(){calls.minimize++;}};
 const window={Capacitor:{isNativePlatform:()=>native,Plugins:{App:plugin}},
  sgGo:page=>{assert.equal(page,'home');calls.home++;}};
 const doc={
  readyState:'complete',
  body:{classList:{contains:value=>value==='sg-home-active'&&inHome}},
  getElementById:id=>id==='sg-menu-panel'?menu:null,
  querySelector:()=>trigger
 };
 vm.runInNewContext(source,{window,document:doc,Promise});
 return {calls,menu,back:()=>{if(back)back();}};
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
