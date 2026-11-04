'use strict';
// Test hors ligne : ne contacte jamais Stripe, Supabase ou un vrai compte.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('supabase/functions/samgo-stripe-sandbox/index.ts','utf8');
const match=(re,label)=>{
 const result=source.match(re);
 assert.ok(result,'Code introuvable : '+label);
 return result[0];
};
function boot(){
 const statements=[
  match(/^const FRONT = "[^"]+";/m,'FRONT'),
  match(/^const ALLOWED_ORIGINS = new Set\([^\n]+\);/m,'origines explicitement autorisées'),
  match(/function isAllowedOrigin\(origin:string\|null\):boolean\s*\{[\s\S]*?\n\}/,'contrôle origine')
    .replace('(origin:string|null):boolean','(origin)'),
  match(/function withRequestCors\(response:Response,origin:string\|null\):Response\s*\{[\s\S]*?\n\}/,'CORS réponse')
    .replace('(response:Response,origin:string|null):Response','(response,origin)')
 ].join('\n');
 const ctx=vm.createContext({Set,Response,Headers});
 vm.runInContext(statements+'\nthis.check=isAllowedOrigin;this.prepare=withRequestCors;',ctx);
 return ctx;
}
test('Stripe sandbox autorise uniquement le site SAMGO et les origines mobiles Capacitor',()=>{
 const api=boot();
 for(const origin of ['https://samgo-officiel.github.io','capacitor://localhost','http://localhost','https://localhost',null]){
  assert.equal(api.check(origin),true,String(origin));
 }
 for(const origin of ['https://evil.example','http://samgo-officiel.github.io',
   'https://localhost.evil.example','capacitor://evil.example','http://127.0.0.1',
   'null','file://localhost','https://samgo-officiel.github.io.evil.test']){
  assert.equal(api.check(origin),false,origin);
 }
});
test('une réponse teste l origine sans changer les autres réponses (même en parallèle)',async()=>{
 const api=boot();
 const web=api.prepare(new Response('web',{status:200}), 'https://samgo-officiel.github.io');
 const ios=api.prepare(new Response('ios',{status:200}), 'capacitor://localhost');
 const android=api.prepare(new Response('android',{status:400}),'http://localhost');
 assert.equal(web.headers.get('access-control-allow-origin'),'https://samgo-officiel.github.io');
 assert.equal(ios.headers.get('access-control-allow-origin'),'capacitor://localhost');
 assert.equal(android.headers.get('access-control-allow-origin'),'http://localhost');
 assert.equal(android.status,400);
 assert.equal(ios.headers.get('vary'),'Origin');
 assert.equal(await web.text(),'web');
 assert.equal(await ios.text(),'ios');
});
test('le préflight autorise les origines natives sans autoriser des appels non authentifiés',()=>{
 assert.match(source,/req\.method==="OPTIONS"[\s\S]*?status:204/);
 assert.match(source,/"Access-Control-Allow-Origin":origin\|\|FRONT/);
 assert.match(source,/if\(!isAllowedOrigin\(origin\)\)/);
 assert.match(source,/const user=await readUser\(req\)/);
 assert.match(source,/stripeKey\.startsWith\("sk_test_"\)/);
 assert.doesNotMatch(source,/Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
 assert.doesNotMatch(source,/sk_live_[A-Za-z0-9]+/);
});
