'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).find(s=>s.includes('window.samgoCreateClient'));
assert.ok(script);
function boot(fetcher,signalType){
 const store=new Map();
 const sessionStorage={
  getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)
 };
 const window={location:{hash:'',origin:'https://samgo-officiel.github.io',
  pathname:'/samgo-v3-demo/',search:''},history:{replaceState(){}}};
 vm.runInNewContext(script,{
  window,sessionStorage,fetch:fetcher,AbortSignal:signalType,
  URL,URLSearchParams,Date,Promise
 });
 return window.samgoCreateClient('https://test.supabase.co','sb_publishable_test');
}
function ok(data){return {ok:true,text:async()=>JSON.stringify(data)};}
test('le client applique un délai max de 20 secondes lorsque possible',async()=>{
 let timeout=0,signal=null;
 const AbortSignal={timeout(n){timeout=n;return {marker:'timeout-signal'};}};
 const client=boot(async(_url,options)=>{signal=options.signal;
  return ok({access_token:'token',refresh_token:'refresh',expires_in:3600,user:{id:'u1'}});
 },AbortSignal);
 const result=await client.auth.signInWithPassword({email:'person@example.test',password:'example'});
 assert.equal(result.error,null);
 assert.equal(timeout,20000);
 assert.equal(signal.marker,'timeout-signal');
});
test('un délai dépassé affiche un message utile sans casser le compte',async()=>{
 const client=boot(async()=>{const e=new Error('operation timed out');e.name='TimeoutError';throw e;},
  {timeout:()=>({})});
 const result=await client.auth.signInWithPassword({email:'person@example.test',password:'example'});
 assert.match(result.error.message,/Connexion trop lente.*20 secondes/);
});
test('la lecture lente du corps de réponse est aussi protégée',async()=>{
 const client=boot(async()=>({ok:true,text:async()=>{const e=Error('aborted');e.name='AbortError';throw e;}}),
  {timeout:()=>({})});
 const result=await client.auth.signInWithPassword({email:'person@example.test',password:'example'});
 assert.match(result.error.message,/Connexion trop lente/);
});
test('ancien navigateur sans AbortSignal continue à fonctionner',async()=>{
 const client=boot(async(_url,opt)=>{
  assert.equal(opt.signal,undefined);
  return ok({access_token:'ok',refresh_token:'next',expires_in:3600,user:{id:'u'}});
 });
 const result=await client.auth.signInWithPassword({email:'person@example.test',password:'example'});
 assert.equal(result.error,null);
});
