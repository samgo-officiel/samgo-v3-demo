'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/parcours-v2-test.js','utf8');
const html=fs.readFileSync('index.html','utf8');
function boot({connected=true,ads=[],replies=[],choices=[],fail=false,approved=false}={}){
 const nodes=new Map(),get=id=>{
  if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false});
  return nodes.get(id);
 };
 const user=connected?{id:'user-a'}:null;
 const reply=data=>fail?{error:Error('offline')}:{data,error:null};
 const requests={ads:0,replies:0,choices:0};
 let authHandler=null;
 const client={
  testRequests:{mine:async()=>{requests.ads++;return reply(ads);}},
  testReplies:{list:async()=>{requests.replies++;return reply(replies);}},
  testChoices:{list:async()=>{requests.choices++;return reply(choices);}},
  auth:{onAuthStateChange(fn){authHandler=fn;}}
 };
 const win={};
 vm.runInNewContext(source,{
  window:win,document:{getElementById:get},client,sessionUser:user,
  driverSimAllowed:approved,navigator:{onLine:true},Date,Set,Promise
 },{filename:'parcours-v2'});
 return {api:win.sgJourneyV2,get,requests,auth:ev=>authHandler?.(ev)};
}
const ad={id:'ad-1',statut:'test_en_attente',
 expire_le:new Date(Date.now()+3600000).toISOString()};
test('le diagnostic V2 est relié à la page Courses, sans demande automatique de GPS',()=>{
 assert.match(html,/id="sgJourneyStatus"/);
 assert.match(html,/src="assets\/parcours-v2-test.js/);
 assert.doesNotMatch(source,/getCurrentPosition|watchPosition|requestPermission/);
});
test('un compte non connecté voit une instruction de connexion, sans requête',async()=>{
 const app=boot({connected:false});
 await app.api.check();
 assert.match(app.get('sgJourneyStatus').textContent,/pas connecté/);
 assert.equal(app.requests.ads,0);
});
test('une annonce active sans chauffeur explique le prochain geste',async()=>{
 const app=boot({ads:[ad]});
 await app.api.check();
 assert.match(app.get('sgJourneyStatus').textContent,/en attente de chauffeur/);
 assert.match(app.get('sgJourneyStatus').textContent,/autre compte chauffeur/);
 assert.equal(app.requests.ads,1);
 assert.equal(app.requests.replies,1);
 assert.equal(app.requests.choices,1);
});
test('un compte chauffeur ne peut pas répondre à sa propre annonce',async()=>{
 const app=boot({ads:[ad],approved:true});
 await app.api.check();
 assert.match(app.get('sgJourneyStatus').textContent,/ne peut pas répondre à sa propre annonce/);
});
test('une réponse existante indique comment ouvrir le chat',async()=>{
 const app=boot({ads:[ad],replies:[{annonce_id:'ad-1'}]});
 await app.api.check();
 assert.match(app.get('sgJourneyStatus').textContent,/choisissez le chauffeur/);
});
test('un chauffeur choisi débloque le texte de messagerie',async()=>{
 const app=boot({ads:[ad],choices:[{annonce_id:'ad-1',client_id:'user-a',statut:'choisi_test'}]});
 await app.api.check();
 assert.match(app.get('sgJourneyStatus').textContent,/utiliser la messagerie/);
});
test('un problème réseau ne prétend pas que tout est synchronisé',async()=>{
 const app=boot({ads:[ad],fail:true});
 await app.api.check();
 assert.match(app.get('sgJourneyStatus').textContent,/Impossible de vérifier/);
 assert.equal(app.get('sgJourneyCheck').disabled,false);
});
test('la déconnexion efface le bilan affiché',async()=>{
 const app=boot({ads:[ad]});
 await app.api.check();
 app.auth('SIGNED_OUT');
 assert.match(app.get('sgJourneyStatus').textContent,/Connectez-vous/);
});
