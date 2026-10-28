'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets/dossier-chauffeur-test.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function fixture(){
  const nodes=new Map();
  const calls=[];
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false});
    return nodes.get(id);
  };
  const context={
    window:{},
    document:{getElementById:node},
    sessionUser:{id:A},
    client:{auth:{getAccessToken:async()=> 'test-token-in-memory'}},
    SUPABASE_URL:'https://example.supabase.co',
    PUBLISHABLE_KEY:'sb_publishable_TEST_PUBLIC',
    fetch:async(url,options)=>{
      calls.push({url,options});
      assert.match(url,/\/storage\/v1\/object\/list\/samgo-driver-documents$/);
      assert.equal(options.method,'POST');
      assert.equal(options.cache,'no-store');
      assert.equal(options.headers.Authorization,'Bearer test-token-in-memory');
      const body=JSON.parse(options.body);
      assert.ok([A+'/permis/',A+'/domicile/',A+'/selfie/'].includes(body.prefix));
      return {ok:true,json:async()=>body.prefix.endsWith('/permis/')?[{name:'document'}]:[]};
    }
  };
  vm.runInNewContext(source,context);
  return {context,node,calls};
}
test('le dossier affiche la présence sans accorder la moindre validation',async()=>{
  const f=fixture();
  f.context.window.sgDriverDocsTest.setCandidate(true);
  await f.context.window.sgDriverDocsTest.inspect();
  assert.equal(f.calls.length,3);
  assert.match(f.node('sgDocsPermis').textContent,/NON VÉRIFIÉ/);
  assert.equal(f.node('sgDocsDomicile').textContent,'Aucun dépôt');
  assert.equal(f.node('sgDocsSelfie').textContent,'Aucun dépôt');
  assert.match(f.node('sgDocsStatus').textContent,/Aucun document n’a été ouvert/);
});
test('pas de candidature ou compte invalide : aucune lecture de stockage',async()=>{
  const f=fixture();
  await f.context.window.sgDriverDocsTest.inspect();
  assert.equal(f.calls.length,0);
  f.context.sessionUser.id='id-invalide';
  f.context.window.sgDriverDocsTest.setCandidate(true);
  await f.context.window.sgDriverDocsTest.inspect();
  assert.equal(f.calls.length,0);
});
test('changement de compte pendant un appel réseau : résultat ancien ignoré',async()=>{
  const f=fixture();
  let finish;
  f.context.fetch=()=>new Promise(resolve=>{finish=()=>resolve({ok:true,json:async()=>[{name:'document'}]});});
  f.context.window.sgDriverDocsTest.setCandidate(true);
  const request=f.context.window.sgDriverDocsTest.inspect();
  // Autoriser la fin de la récupération de jeton avant de changer de compte.
  await Promise.resolve(); await Promise.resolve();
  f.context.sessionUser={id:B};
  f.context.window.sgDriverDocsTest.reset();
  assert.ok(finish,'Le premier appel n’a pas démarré');
  finish();
  await request;
  assert.equal(f.node('sgDocsPermis').textContent,'Non contrôlé');
  assert.match(f.node('sgDocsStatus').textContent,/Coffre non consulté/);
});
test('aucune saisie de pièce réelle ni RIB sur ce parcours',()=>{
  assert.match(html,/id="sgDriverDocumentsTest"/);
  assert.match(html,/onclick="window.sgDriverDocsTest.inspect\(\)"/);
  assert.match(html,/src="assets\/dossier-chauffeur-test\.js\?/);
  assert.doesNotMatch(source,/\bPUT\b|\bDELETE\b|\/object\/upload\/|FileReader|type="file"|createSignedUrl/);
  assert.match(html,/Non collecté par SAMGO/);
  assert.match(html,/Ne transmettez ici ni permis réel/);
});
