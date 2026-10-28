'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../assets/diagnostic-appareil-test.js'),'utf8');
class Node {
 constructor(){this.children=[];this.textContent='';this.disabled=false;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
}
function setup(overrides={}){
 const report=new Node(),button=new Node();
 const counters={geoCalls:0,permissionQueries:0};
 const navigator={
  onLine:true,standalone:false,
  geolocation:{getCurrentPosition(){counters.geoCalls++;throw Error('Interdit : aucune géolocalisation automatique');}},
  permissions:{async query(){counters.permissionQueries++;return {state:'prompt'};}},
  serviceWorker:{async getRegistration(){return {active:true};}},
  ...overrides.navigator
 };
 const win={isSecureContext:true,matchMedia:()=>({matches:false}),...overrides.window};
 const document={
  getElementById:id=>id==='sgDeviceReport'?report:id==='sgDeviceRun'?button:null,
  createElement:()=>new Node()
 };
 win.navigator=navigator;
 vm.runInNewContext(script,{window:win,document,navigator,Notification:{permission:'default'}});
 const flatten=node=>[node.textContent,...node.children.flatMap(flatten)].join(' ');
 return {run:win.sgDeviceCheck.run,report,button,counters,text:()=>flatten(report)};
}
test('le diagnostic ne demande jamais la position et ne fait pas de requête réseau',async()=>{
 const page=setup();
 await page.run();
 assert.equal(page.counters.geoCalls,0);
 assert.equal(page.counters.permissionQueries,1);
 assert.match(page.text(),/position non demandée/);
 assert.equal(page.button.disabled,false);
});
test('le navigateur indique proprement le refus de localisation',async()=>{
 const page=setup({navigator:{permissions:{query:async()=>({state:'denied'})}}});
 await page.run();
 assert.match(page.text(),/refusée/);
 assert.equal(page.counters.geoCalls,0);
});
test('app installée reconnue sans accès aux données utilisateur',async()=>{
 const page=setup({window:{matchMedia:()=>({matches:true})}});
 await page.run();
 assert.match(page.text(),/ouverte depuis l’icône/);
});
test('permissions non prises en charge ne bloquent pas le diagnostic',async()=>{
 const page=setup({navigator:{permissions:null,serviceWorker:null,geolocation:null,onLine:false}});
 await page.run();
 assert.match(page.text(),/hors ligne/);
 assert.match(page.text(),/GPS du navigateur/);
 assert.match(page.text(),/service worker non pris en charge/);
});
test('erreur de consultation des permissions traitée sans planter',async()=>{
 const page=setup({navigator:{permissions:{query:async()=>{throw Error('unsupported');}}}});
 await page.run();
 assert.match(page.text(),/état non accessible/);
 assert.equal(page.button.disabled,false);
});

test('le diagnostic detecte une application Android native sans GPS automatique',async()=>{
 const page=setup({window:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'android'}}});
 await page.run();
 assert.match(page.text(),/application native Android \(TEST\)/);
 assert.match(page.text(),/pages locales de l’application disponibles/);
 assert.equal(page.counters.geoCalls,0);
});
test('le diagnostic detecte une application iPhone native sans GPS automatique',async()=>{
 const page=setup({window:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios'}}});
 await page.run();
 assert.match(page.text(),/application native iPhone\/iPad \(TEST\)/);
 assert.equal(page.counters.geoCalls,0);
});

test('sur Android natif, la version est lue localement sans permission',async()=>{
 let count=0;
 const page=setup({window:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'android',
  Plugins:{App:{getInfo:async()=>{count++;return {name:'SAMGO TEST',version:'0.1.0',build:'1'};}}}}}});
 await page.run();
 assert.equal(count,1);
 assert.match(page.text(),/Version SAMGO TEST/);
 assert.match(page.text(),/0.1.0 \(build 1\)/);
 assert.equal(page.counters.geoCalls,0);
});
