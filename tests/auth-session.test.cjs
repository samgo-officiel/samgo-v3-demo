'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(s => s.includes('window.samgoCreateClient'));
assert.ok(script, 'Le client navigateur SAMGO doit être présent');
const response = (status, value={})=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(value)});
const expired = () => ({access_token:'expired',refresh_token:'one-use',
  expires_at:Date.now()-1000,user:{id:'client-demo'}});
function boot(fetchHandler, state=null, hash=''){
  const entries=new Map();
  if(state)entries.set('samgo_v3_test_session',JSON.stringify(state));
  const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),
    removeItem:key=>entries.delete(key)};
  let callbackUrl=null;
  const win={
    location:{hash,origin:'https://samgo-officiel.github.io',
      pathname:'/samgo-v3-demo/',search:'',
      href:'https://samgo-officiel.github.io/samgo-v3-demo/'+hash},
    history:{replaceState:(_,__,url)=>{callbackUrl=url;}}
  };
  vm.runInNewContext(script,{window:win,sessionStorage:storage,fetch:fetchHandler,
    URL,URLSearchParams},{filename:'SAMGO-client-auth'});
  return {client:win.samgoCreateClient('https://demo.supabase.co','sb_publishable_test'),
    entries,get callbackUrl(){return callbackUrl;}};
}
test('une seule requête refresh pour appels simultanés',async()=>{
  let calls=0;
  const app=boot(async url=>{
    if(url.includes('grant_type=refresh_token')){
      calls++;
      return calls===1?response(200,{access_token:'fresh',refresh_token:'new',expires_in:3600}):
        response(400,{message:'used refresh token'});
    }
    return response(200,{id:'client-demo'});
  },expired());
  const [a,b,t]=await Promise.all([app.client.auth.getUser(),
    app.client.auth.getUser(),app.client.auth.getAccessToken()]);
  assert.equal(calls,1);assert.equal(a.error,null);
  assert.equal(b.error,null);assert.equal(t,'fresh');
});
test('une coupure réseau conserve les jetons et renvoie une erreur',async()=>{
  const app=boot(async()=>{throw Error('offline')},expired());
  const result=await app.client.auth.getUser();
  assert.ok(result.error);assert.equal(app.entries.has('samgo_v3_test_session'),true);
});
test('un refus HTTP 401 invalide la session',async()=>{
  const app=boot(async()=>response(401,{message:'invalid token'}),expired());
  const r=await app.client.auth.getUser();
  assert.ok(r.error);assert.equal(app.entries.has('samgo_v3_test_session'),false);
});
test('la déconnexion efface les jetons avant la réponse du serveur',async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const app=boot(async url=>{if(url.endsWith('/auth/v1/logout'))await pending;
    return response(200,{});},{...expired(),expires_at:Date.now()+3600000});
  const signout=app.client.auth.signOut();
  assert.equal(app.entries.has('samgo_v3_test_session'),false);
  release();await signout;
});
test('inscription : adresse de confirmation du même domaine bien transmise',async()=>{
  const calls=[];
  const app=boot(async url=>{calls.push(url);return response(200,{user:{id:'fake'}})});
  const url='https://samgo-officiel.github.io/samgo-v3-demo/';
  const result=await app.client.auth.signUp({email:'test@example.test',password:'test-password',
    options:{emailRedirectTo:url}});
  assert.equal(result.error,null);
  assert.ok(calls[0].includes('redirect_to='+encodeURIComponent(url)));
});
test('lien recovery : session reconnue, jetons retirés de la barre URL',()=>{
  const app=boot(async()=>response(200,{}),null,
    '#access_token=fake-access&refresh_token=fake-refresh&expires_in=3600&token_type=bearer&type=recovery');
  assert.equal(app.entries.get('samgo_v3_recovery_pending'),'1');
  assert.equal(app.callbackUrl,'/samgo-v3-demo/');
  assert.equal(app.entries.has('samgo_v3_test_session'),true);
});

test('une réponse refresh tardive ne reconnecte pas après déconnexion',async()=>{
  let release;
  const suspended = new Promise(resolve=>{release=resolve;});
  const app=boot(async url=>{
    if(url.includes('grant_type=refresh_token')){
      await suspended;
      return response(200,{access_token:'late',refresh_token:'late-next',expires_in:3600});
    }
    return response(200,{});
  },expired());
  const renewing=app.client.auth.getAccessToken();
  await app.client.auth.signOut();
  assert.equal(app.entries.has('samgo_v3_test_session'),false);
  release();
  const token=await renewing;
  assert.equal(token,null);
  assert.equal(app.entries.has('samgo_v3_test_session'),false);
});

test('un fragment de jeton incomplet est efface sans creer de session',()=>{
 const app=boot(async()=>response(200,{}),null,
   '#access_token=fake-access&refresh_token=fake-refresh&token_type=inconnu');
 assert.equal(app.entries.has('samgo_v3_test_session'),false);
 assert.equal(app.callbackUrl,'/samgo-v3-demo/');
});


test('un ancien refus 401 ne déconnecte pas le compte connecté ensuite',async()=>{
 let releaseOld;
 const pending=new Promise(resolve=>{releaseOld=resolve;});
 const app=boot(async(url,options)=>{
  if(url.endsWith('/auth/v1/user')){
   const token=options?.headers?.Authorization||'';
   if(token.includes('old-user')){await pending;return response(401,{message:'old token expired'});}
   return response(200,{id:'new-user'});
  }
  if(url.includes('grant_type=password'))return response(200,{
   access_token:'new-user-access',refresh_token:'new-refresh',expires_in:3600,user:{id:'new-user'}
  });
  return response(200,{});
 },{access_token:'old-user-access',refresh_token:'old-refresh',expires_at:Date.now()+3600000,user:{id:'old-user'}});
 const oldGet=app.client.auth.getUser();
 const newer=await app.client.auth.signInWithPassword({email:'new@example.test',password:'example'});
 assert.equal(newer.error,null);
 releaseOld();
 const previous=await oldGet;
 assert.ok(previous.error);
 assert.equal(app.entries.has('samgo_v3_test_session'),true);
 const active=JSON.parse(app.entries.get('samgo_v3_test_session'));
 assert.equal(active.user.id,'new-user');
 const current=await app.client.auth.getUser();
 assert.equal(current.error,null);
 assert.equal(current.data.user.id,'new-user');
});
test('une vieille réponse getUser 200 ne remplace pas la nouvelle identité',async()=>{
 let releaseOld;
 const pending=new Promise(resolve=>{releaseOld=resolve;});
 const app=boot(async(url,options)=>{
  if(url.endsWith('/auth/v1/user')){
   if(options?.headers?.Authorization?.includes('old-user')){await pending;return response(200,{id:'old-user'});}
   return response(200,{id:'new-user'});
  }
  if(url.includes('grant_type=password'))return response(200,{
   access_token:'new-user-access',refresh_token:'new-refresh',expires_in:3600,user:{id:'new-user'}
  });
  return response(200,{});
 },{access_token:'old-user-access',refresh_token:'old-refresh',expires_at:Date.now()+3600000,user:{id:'old-user'}});
 const pendingOld=app.client.auth.getUser();
 const login=await app.client.auth.signInWithPassword({email:'new@example.test',password:'example'});
 assert.equal(login.error,null);
 releaseOld();
 const old=await pendingOld;
 assert.ok(old.error,'la requête de l’ancien compte doit être rejetée');
 const fresh=await app.client.auth.getUser();
 assert.equal(fresh.error,null);
 assert.equal(fresh.data.user.id,'new-user');
});
test('connexion lente après déconnexion ne restaure jamais une session',async()=>{
 let releaseLogin;
 const slow=new Promise(resolve=>{releaseLogin=resolve;});
 const app=boot(async(url)=>{
  if(url.includes('grant_type=password')){
   await slow;
   return response(200,{access_token:'late-access',refresh_token:'late-refresh',expires_in:3600,user:{id:'late'}});
  }
  return response(200,{});
 });
 const login=app.client.auth.signInWithPassword({email:'late@example.test',password:'example'});
 await app.client.auth.signOut();
 releaseLogin();
 const old=await login;
 assert.ok(old.error);
 assert.equal(app.entries.has('samgo_v3_test_session'),false);
});
test('inscription lente après déconnexion ne reconnecte jamais un compte',async()=>{
 let releaseSignup;
 const slow=new Promise(resolve=>{releaseSignup=resolve;});
 const app=boot(async(url)=>{
  if(url.includes('/auth/v1/signup')){
   await slow;
   return response(200,{access_token:'late-access',refresh_token:'late-refresh',expires_in:3600,user:{id:'late'}});
  }
  return response(200,{});
 });
 const signup=app.client.auth.signUp({email:'late@example.test',password:'example'});
 await app.client.auth.signOut();
 releaseSignup();
 const old=await signup;
 assert.ok(old.error);
 assert.equal(app.entries.has('samgo_v3_test_session'),false);
});
