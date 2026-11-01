'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'assets/recuperation-compte-test.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

function boot(pending){
 const elements=new Map(),routes=[];
 class FakeNode {
  constructor(tag){this.tag=tag;this.hidden=false;this.textContent='';this.value='';this.style={};
   this.classList={add(){},remove(){}};}
  setAttribute(name,value){this[name]=String(value);if(name==='id')elements.set(value,this);}
  append(){}
  insertBefore(){}
  addEventListener(){}
  focus(){}
 }
 const node=id=>{const n=new FakeNode('div');elements.set(id,n);return n;};
 for(const id of ['loggedOut','loggedIn','authPanel','authForm','authStatus','email'])node(id);
 const document={readyState:'complete',getElementById:id=>elements.get(id)||null,
  createElement:tag=>new FakeNode(tag),addEventListener(){}};
 const sessionStorage={getItem:key=>key==='samgo_v3_recovery_pending'&&pending?'1':null,
  removeItem(){},setItem(){}};
 const window={location:{hash:'',origin:'https://samgo-officiel.github.io',
  pathname:'/samgo-v3-demo/'}};
 vm.runInNewContext(src,{window,document,sessionStorage,URLSearchParams,
  sgGo:view=>routes.push(view)}, {filename:'samgo-recovery'});
 return {routes,elements};
}
test('Un lien valide de récupération ouvre immédiatement Mon compte et le formulaire de nouveau mot de passe',()=>{
 const app=boot(true);
 assert.deepEqual(app.routes,['account']);
 assert.equal(app.elements.get('sgResetCompletePanel').hidden,false);
 assert.ok(html.includes('assets/recuperation-compte-test.js?v=20261101-renvoi-confirmation'));
});
test('Sans lien de récupération, la page conserve son parcours habituel',()=>{
 const app=boot(false);
 assert.deepEqual(app.routes,[]);
 assert.equal(app.elements.get('sgResetCompletePanel').hidden,true);
});
