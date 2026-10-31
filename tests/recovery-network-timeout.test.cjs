'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('assets/recuperation-compte-test.js','utf8');
function boot(pending=false) {
  const elements=new Map(),forms=[],timers=[],cleared=[];
  const callbacks=[];
  class Node {
    constructor(tag='div'){this.tag=tag;this.hidden=false;this.disabled=false;this.value='';this.textContent='';
      this.style={};this.events={};this.classList={add(){},remove(){}};if(tag==='form')forms.push(this);}
    setAttribute(k,v){this[k]=String(v);if(k==='id')elements.set(v,this);}
    append(){} insertBefore(){} focus(){}
    addEventListener(k,fn){this.events[k]=fn;}
  }
  for(const id of ['loggedOut','loggedIn','authPanel','authForm','authStatus','email']){
    const n=new Node();elements.set(id,n);
  }
  class Controller {
    constructor(){this.signal={aborted:false,addEventListener:(name,fn)=>{if(name==='abort')callbacks.push(fn);}};}
    abort(){this.signal.aborted=true;callbacks.forEach(fn=>fn());}
  }
  const fetch=(url,options)=>new Promise((resolve,reject)=>{
    options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})));
  });
  const storage=new Map(pending?[['samgo_v3_recovery_pending','1']]:[]);
  const sessionStorage={getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k),setItem:(k,v)=>storage.set(k,v)};
  const document={readyState:'complete',getElementById:id=>elements.get(id)||null,createElement:tag=>new Node(tag),addEventListener(){}};
  const window={location:{hash:'',origin:'https://samgo-officiel.github.io',pathname:'/samgo-v3-demo/'}};
  vm.runInNewContext(src,{document,window,sessionStorage,URLSearchParams,
    AbortController:Controller,fetch,PUBLISHABLE_KEY:'sb_publishable_test',
    client:{auth:{getAccessToken:async()=> 'token-de-test'}},sgGo(){},
    setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:id=>cleared.push(id)}, {filename:'samgo-recovery'});
  return {elements,forms,timers,cleared};
}
test('un réseau bloqué pendant la demande de mail se débloque avec une explication prudente',async()=>{
  const app=boot();
  app.elements.get('sgResetEmail').value='client@example.test';
  const p=app.forms[0].events.submit({preventDefault(){}});
  assert.equal(app.elements.get('sgResetSubmit').disabled,true);
  assert.equal(app.timers.length,1);
  app.timers[0]();
  await p;
  assert.equal(app.elements.get('sgResetSubmit').disabled,false);
  assert.match(app.elements.get('sgResetRequestInfo').textContent,/peut-être été envoyé/);
  assert.deepEqual(app.cleared,[1]);
});
test('un réseau bloqué pendant le changement de mot de passe informe sans conclure à un échec',async()=>{
  const app=boot(true);
  app.elements.get('sgResetNew').value='nouveau-code-de-test';
  app.elements.get('sgResetConfirm').value='nouveau-code-de-test';
  const p=app.forms[1].events.submit({preventDefault(){}});
  // Le jeton est obtenu de façon asynchrone avant de déclencher fetch.
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.timers.length,1);
  app.timers[0]();
  await p;
  assert.equal(app.elements.get('sgResetSave').disabled,false);
  assert.match(app.elements.get('sgResetCompleteStatus').textContent,/peut-être été modifié/);
  assert.deepEqual(app.cleared,[1]);
});
