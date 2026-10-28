'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','manifest.webmanifest'),'utf8'));
const nav=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function sgGo(view)'));
assert.ok(nav,'Script de navigation introuvable');
function launch(search){
 const calls={gps:0,scroll:[],space:[]};
 const bodyClasses=new Set(['sg-home-active']);
 const doc={
  body:{classList:{
   contains:cls=>bodyClasses.has(cls),
   toggle:(cls,value)=>{if(value)bodyClasses.add(cls);else bodyClasses.delete(cls);}
  }},
  getElementById:id=>({
   scrollIntoView(){calls.scroll.push(id);},
   hasAttribute(){return false;},
   setAttribute(){},removeAttribute(){}
  }),
  querySelector:()=>null,querySelectorAll:()=>[]
 };
 const win={location:{search},innerHeight:800,addEventListener(){},
  scrollTo(){}};
 const ctx={window:win,document:doc,URLSearchParams,
  setSpace:value=>calls.space.push(value),
  Math};
 vm.runInNewContext(nav,ctx);
 return {classes:bodyClasses,calls};
}
test('raccourcis Android correspondent à des vues existantes',()=>{
 const expected=new Set(['book','trips','driver']);
 assert.ok(manifest.shortcuts?.length>=3);
 for(const item of manifest.shortcuts){
  const url=new URL(item.url,'https://samgo-officiel.github.io');
  assert.equal(url.pathname,manifest.scope);
  assert.ok(expected.has(url.searchParams.get('app')));
 }
});
test('ouvrir Réserver démarre sur le bon écran sans GPS',()=>{
 const x=launch('?app=book');
 assert.equal(x.classes.has('sg-route-book'),true);
 assert.equal(x.calls.space[0],'raccompagner');
 assert.equal(x.calls.gps,0);
});
test('ouvrir Chauffeur ne lance pas de demande GPS automatique',()=>{
 const x=launch('?app=driver');
 assert.equal(x.classes.has('sg-route-driver'),true);
 assert.equal(x.calls.space[0],'chauffeur');
 assert.equal(x.calls.gps,0);
});
test('un paramètre non reconnu ne change pas le parcours d’accueil',()=>{
 const x=launch('?app=__unknown__');
 assert.deepEqual(x.calls.space,[]);
 assert.equal(x.classes.has('sg-home-active'),true);
});
test('paramètres Stripe de retour indépendants des raccourcis PWA',()=>{
 const x=launch('?stripe_test_checkout=success');
 assert.equal(x.classes.has('sg-home-active'),true);
 assert.deepEqual(x.calls.space,[]);
});
