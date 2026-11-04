'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('assets/recuperation-compte-test.js','utf8');

function boot(handler=async()=>({ok:true,status:200}),offline=false){
  const elements=new Map(),calls=[],memory=new Map();
  class Node{
    constructor(tag='div'){
      this.tag=tag;this.hidden=false;this.disabled=false;this.value='';
      this.textContent='';this.style={};this.events={};
      this.classList={add(){},remove(){}};
    }
    setAttribute(name,value){this[name]=String(value);if(name==='id')elements.set(value,this);}
    addEventListener(name,fn){this.events[name]=fn;}
    append(){} insertBefore(){} focus(){}
  }
  for(const id of ['loggedOut','loggedIn','authPanel','authForm','authStatus','email']){
    elements.set(id,new Node());
  }
  const document={
    readyState:'complete',getElementById:id=>elements.get(id)||null,
    createElement:tag=>new Node(tag),addEventListener(){}
  };
  const sessionStorage={
    getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)
  };
  const window={location:{hash:'',origin:'https://samgo-officiel.github.io',pathname:'/samgo-v3-demo/'}};
  const fetch=async(url,options)=>{calls.push({url,options});return handler(url,options);};
  vm.runInNewContext(src,{
    window,document,sessionStorage,URLSearchParams,PUBLISHABLE_KEY:'sb_publishable_test',
    navigator:{onLine:!offline},fetch,AbortController,setTimeout,clearTimeout
  },{filename:'SAMGO-renvoi-confirmation'});
  const send=()=>elements.get('sgResendConfirmation').events.click();
  const status=()=>elements.get('sgResendConfirmationStatus').textContent;
  return {elements,calls,memory,send,status};
}
test('un renvoi exige une adresse e-mail entière, sans requête inutile',async()=>{
  const app=boot();
  app.elements.get('email').value='simple-pseudo';
  await app.send();
  assert.match(app.status(),/adresse e-mail complète/);
  assert.equal(app.calls.length,0);
});
test('le renvoi manuel appelle Supabase signup avec la bonne URL et sans mot de passe',async()=>{
  const app=boot();
  app.elements.get('email').value=' client@example.test ';
  await app.send();
  assert.equal(app.calls.length,1);
  const [{url,options}]=app.calls;
  assert.equal(url,'https://tgwdycgwgfisuskxwkvk.supabase.co/auth/v1/resend?redirect_to='+
    encodeURIComponent('https://samgo-officiel.github.io/samgo-v3-demo/'));
  assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{type:'signup',email:'client@example.test'});
  assert.ok(!options.headers.Authorization);
  assert.match(app.status(),/Si ce compte attend une confirmation/);
  assert.doesNotMatch(app.status(),/e-mail envoyé avec succès|compte existe/);
});
test('un renvoi réussi protège du double clic et répète un délai prudent',async()=>{
  const app=boot();
  app.elements.get('email').value='client@example.test';
  await app.send();
  await app.send();
  assert.equal(app.calls.length,1);
  assert.match(app.status(),/Attendez encore/);
  assert.ok(Number(app.memory.get('samgo_v3_confirm_next_attempt'))>Date.now());
});
test('un refus SMTP ne prétend jamais qu un e-mail est parti',async()=>{
  const app=boot(async()=>({ok:false,status:403}));
  app.elements.get('email').value='client@example.test';
  await app.send();
  assert.match(app.status(),/SMTP doit être configuré/);
  assert.equal(app.memory.has('samgo_v3_confirm_next_attempt'),false);
});
test('le quota 429 est présenté comme une limite serveur, sans faux succès',async()=>{
  const app=boot(async()=>({ok:false,status:429}));
  app.elements.get('email').value='client@example.test';
  await app.send();
  assert.match(app.status(),/Aucun nouvel e-mail n’a été envoyé/);
  assert.equal(app.memory.has('samgo_v3_confirm_next_attempt'),false);
});
test('hors connexion : ne contacte pas Supabase',async()=>{
  const app=boot(undefined,true);
  app.elements.get('email').value='client@example.test';
  await app.send();
  assert.equal(app.calls.length,0);
  assert.match(app.status(),/hors connexion/);
});
test('un échec réseau laisse le bouton disponible pour une nouvelle tentative',async()=>{
  const app=boot(async()=>{throw Object.assign(new Error('aborted'),{name:'AbortError'});});
  app.elements.get('email').value='client@example.test';
  await app.send();
  assert.match(app.status(),/peut-être été envoyé/);
  assert.equal(app.elements.get('sgResendConfirmation').disabled,false);
});