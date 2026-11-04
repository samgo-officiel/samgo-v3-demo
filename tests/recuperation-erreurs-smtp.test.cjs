'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('assets/recuperation-compte-test.js','utf8');

function appWithResponse(statusCode){
  const elements=new Map(),forms=[],requests=[];
  class Node{
    constructor(tag='div'){
      this.tag=tag;this.hidden=false;this.disabled=false;this.value='';
      this.textContent='';this.style={};this.events={};
      this.classList={add(){},remove(){}};
      if(tag==='form')forms.push(this);
    }
    setAttribute(key,value){this[key]=String(value);if(key==='id')elements.set(value,this);}
    addEventListener(event,handler){this.events[event]=handler;}
    append(){} insertBefore(){} focus(){}
  }
  for(const id of ['loggedOut','loggedIn','authPanel','authForm','authStatus','email'])
    elements.set(id,new Node());
  const document={readyState:'complete',getElementById:id=>elements.get(id)||null,
    createElement:tag=>new Node(tag),addEventListener(){}};
  const memory=new Map();
  const sessionStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
  const window={location:{hash:'',origin:'https://samgo-officiel.github.io',pathname:'/samgo-v3-demo/'}};
  const fetch=(url,options)=>{
    requests.push({url,options});
    return Promise.resolve({ok:statusCode>=200&&statusCode<300,status:statusCode});
  };
  vm.runInNewContext(src,{
    window,document,sessionStorage,PUBLISHABLE_KEY:'sb_publishable_fake',
    URLSearchParams,fetch,AbortController,setTimeout,clearTimeout
  });
  const reset=async()=>{
    elements.get('sgResetEmail').value='client@example.test';
    await forms[0].events.submit({preventDefault(){}});
    return elements.get('sgResetRequestInfo').textContent;
  };
  return {reset,requests,elements,memory};
}

test('envoi recovery 403 indique la configuration e-mail et pas un souci de 4G',async()=>{
  const app=appWithResponse(403);
  assert.match(await app.reset(),/SMTP externe peut être nécessaire/);
  assert.equal(app.requests.length,1);
});
test('erreur serveur e-mail 500 indique SMTP, sans déclarer e-mail envoyé',async()=>{
  const app=appWithResponse(500);
  const feedback=await app.reset();
  assert.match(feedback,/serveur d’envoi d’e-mails/);
  assert.doesNotMatch(feedback,/e-mail envoyé|lien envoyé/);
});
test('envoi recovery 429 distingue bien un quota serveur',async()=>{
  const app=appWithResponse(429);
  assert.match(await app.reset(),/Limite d.e-mails SAMGO atteinte/);
});
test('réponse recovery 200 respecte la confidentialité du compte',async()=>{
  const app=appWithResponse(200);
  const feedback=await app.reset();
  assert.match(feedback,/Si cette adresse possède un compte/);
  assert.doesNotMatch(feedback,/votre compte existe|lien envoyé avec succès/);
  const [request]=app.requests;
  assert.equal(request.options.method,'POST');
  assert.deepEqual(JSON.parse(request.options.body),{email:'client@example.test'});
});
test('récupération : après HTTP 200, les doublons sont évités pendant une minute',async()=>{
  const app=appWithResponse(200);
  assert.match(await app.reset(),/Patientez au moins une minute/);
  assert.match(await app.reset(),/Attendez encore/);
  assert.equal(app.requests.length,1);
  assert.ok(Number(app.memory.get('samgo_v3_recovery_next_attempt'))>Date.now());
});
test('récupération : un échec SMTP 500 ne bloque pas une correction et un nouvel essai',async()=>{
  const app=appWithResponse(500);
  await app.reset();
  await app.reset();
  assert.equal(app.requests.length,2);
  assert.equal(app.memory.has('samgo_v3_recovery_next_attempt'),false);
});
