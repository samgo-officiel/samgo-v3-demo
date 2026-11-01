'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/recuperation-compte-test.js','utf8');

function boot({pending=false,request}={}){
  const nodes=new Map(),forms=[],storage=new Map(pending?[['samgo_v3_recovery_pending','1']]:[]);
  const calls=[];
  class Node{
    constructor(tag='div'){
      this.tag=tag;this.children=[];this.events={};this.value='';this.textContent='';
      this.hidden=false;this.disabled=false;this.style={};
      this.classList={add(){},remove(){}};
      if(tag==='form')forms.push(this);
    }
    setAttribute(name,value){this[name]=String(value);if(name==='id')nodes.set(value,this);}
    append(...children){this.children.push(...children);}
    insertBefore(child){this.children.push(child);}
    addEventListener(name,fn){this.events[name]=fn;}
    focus(){}
  }
  for(const id of ['loggedOut','loggedIn','authPanel','authForm','authStatus','email']){
    nodes.set(id,new Node());
  }
  const document={readyState:'complete',createElement:tag=>new Node(tag),
    getElementById:id=>nodes.get(id)||null,addEventListener(){}};
  const sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),
    removeItem:k=>storage.delete(k)};
  const window={location:{hash:'',origin:'https://samgo-officiel.github.io',pathname:'/samgo-v3-demo/'}};
  const fetch=(url,options)=>{
    calls.push({url,options});
    return request?request(url,options):Promise.resolve({ok:true,status:200});
  };
  vm.runInNewContext(source,{
    window,document,sessionStorage,URLSearchParams,fetch,PUBLISHABLE_KEY:'sb_publishable_test',
    client:{auth:{getAccessToken:async()=> 'token-de-test'}},
    AbortController:class{constructor(){this.signal={};}abort(){}},
    setTimeout:()=>1,clearTimeout(){},sgGo(){},console
  },{filename:'SAMGO-recovery'});
  return {forms,nodes,storage,calls,get:id=>nodes.get(id)};
}
const event={preventDefault(){}};
test('une panne du service e-mail est distincte d une panne de connexion locale',async()=>{
  const x=boot({request:async()=>({ok:false,status:503})});
  x.get('sgResetEmail').value='client@example.test';
  await x.forms[0].events.submit(event);
  assert.match(x.get('sgResetRequestInfo').textContent,/Service d.e-mails SAMGO/);
  assert.doesNotMatch(x.get('sgResetRequestInfo').textContent,/Vérifiez la connexion Internet/);
});
test('un double envoi de formulaire ne crée pas deux demandes de lien',async()=>{
  let release;
  const x=boot({request:()=>new Promise(resolve=>{release=resolve;})});
  x.get('sgResetEmail').value='client@example.test';
  const first=x.forms[0].events.submit(event);
  const second=x.forms[0].events.submit(event);
  assert.equal(x.calls.length,1);
  release({ok:true,status:200});
  await Promise.all([first,second]);
  assert.equal(x.get('sgResetSubmit').disabled,false);
});
test('annuler la récupération masque une réponse tardive de changement de mot de passe',async()=>{
  let release;
  const x=boot({pending:true,request:()=>new Promise(resolve=>{release=resolve;})});
  x.get('sgResetNew').value='nouveau-secret-de-test';
  x.get('sgResetConfirm').value='nouveau-secret-de-test';
  const inflight=x.forms[1].events.submit(event);
  await new Promise(resolve=>setImmediate(resolve)); // Le jeton est obtenu avant PUT.
  assert.equal(x.calls.length,1);
  const cancel=x.get('sgResetCompletePanel').children[3];
  await cancel.events.click();
  assert.equal(x.storage.has('samgo_v3_recovery_pending'),false);
  release({ok:true,status:200});
  await inflight;
  assert.equal(x.get('sgResetCompletePanel').hidden,true);
  assert.equal(x.get('authStatus').textContent,'');
});
test('un double enregistrement ne modifie le mot de passe qu une fois',async()=>{
  let release;
  const x=boot({pending:true,request:()=>new Promise(resolve=>{release=resolve;})});
  x.get('sgResetNew').value='nouveau-secret-de-test';
  x.get('sgResetConfirm').value='nouveau-secret-de-test';
  const first=x.forms[1].events.submit(event);
  const second=x.forms[1].events.submit(event);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(x.calls.length,1);
  release({ok:true,status:200});
  await Promise.all([first,second]);
  assert.equal(x.get('sgResetSave').disabled,false);
});
