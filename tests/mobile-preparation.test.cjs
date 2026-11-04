'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mobile=path.join(root,'mobile');
test('preparer le bundle natif sans installation ni publication',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(mobile,'capacitor.config.json'),'utf8'));
 const pkg=JSON.parse(fs.readFileSync(path.join(mobile,'package.json'),'utf8'));
 assert.equal(config.webDir,'www');
 assert.ok(config.appName.includes('TEST'));
 assert.equal(pkg.private,true);
 const output=path.join(mobile,'www');
 try{
  const result=cp.execFileSync(process.execPath,[path.join(mobile,'scripts','prepare-web.cjs')],{
   cwd:mobile,encoding:'utf8',timeout:15000
  });
  assert.match(result,/exportées localement/);
  const index=fs.readFileSync(path.join(output,'index.html'),'utf8');
  assert.ok(index.includes('window.samgoCreateClient'));
  assert.doesNotMatch(index,/navigator\.serviceWorker\.register/);
  assert.doesNotMatch(index,/<link\s+rel="manifest"/);
  for(const file of ['aide.html','donnees-test.html','assets/demandes-geoloc-test.js','assets/messagerie-test.js'])
   assert.equal(fs.existsSync(path.join(output,file)),true,'ressource manquante: '+file);
  assert.equal(fs.existsSync(path.join(output,'sw.js')),false);
  const redirect='https://samgo-officiel.github.io/samgo-v3-demo/';
  const reset=fs.readFileSync(path.join(output,'assets/recuperation-compte-test.js'),'utf8');
  assert.ok(index.includes('emailRedirectTo:'+JSON.stringify(redirect)));
  assert.ok(index.includes('destination.href !== '+JSON.stringify(redirect)));
  assert.ok(reset.includes('const redirect='+JSON.stringify(redirect)));
  assert.ok(index.includes('id="sg-native-only"'),'native should hide PWA installer');
  assert.ok(index.includes('id="sgNativeAuthNotice"'),'native email confirmation guidance');
  assert.ok(index.includes('id="sgNativeLinkStatus"'),'native external HTTPS error message');
  assert.ok(index.includes('assets/native-navigation.js'),'native back button script');
  assert.equal(fs.existsSync(path.join(output,'assets/native-navigation.js')),true);
  assert.ok(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('sgNativeAuthNotice'));
  assert.ok(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('id="sg-native-only"'),
   'native-only adjustments must not leak into public web site');
 }finally{
  fs.rmSync(output,{recursive:true,force:true});
 }
});

test('le smoke iPhone utilise un artefact recent, jamais un ancien run ID fige',()=>{
 const yaml=fs.readFileSync(path.join(root,'.github/workflows/ios-smoke-test.yml'),'utf8');
 assert.match(yaml,/actions\/artifacts\?name=samgo-ios-test-simulateur/);
 assert.match(yaml,/select\(\.expired == false/);
 assert.match(yaml,/steps\.ios_artifact\.outputs\.run_id/);
 assert.doesNotMatch(yaml,/run-id:\s*\d+/);
 // Ne construit aucune IPA et ne soumet rien sur les stores.
 assert.doesNotMatch(yaml,/altool|notarytool|app-store-connect|google-play-developer/);
});

test('compiler iPhone TEST publie le bundle meme si un simulateur lent ne demarre pas',()=>{
 const compile=fs.readFileSync(path.join(root,'.github/workflows/ios-simulator-test.yml'),'utf8');
 const smoke=fs.readFileSync(path.join(root,'.github/workflows/ios-smoke-test.yml'),'utf8');
 assert.match(compile,/xcodebuild[\s\S]*?CODE_SIGNING_ALLOWED=NO build/);
 assert.match(compile,/samgo-ios-test-simulateur\.zip/);
 assert.match(compile,/name: samgo-ios-test-simulateur/);
 assert.doesNotMatch(compile,/xcrun simctl (?:boot|launch|install)/);
 assert.match(smoke,/workflow_run:/);
 assert.match(smoke,/workflows:[\s\S]*?"SAMGO - Compiler iPhone TEST \(simulateur uniquement\)"/);
 assert.match(smoke,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(smoke,/github\.event\.workflow_run\.id \|\| steps\.ios_artifact\.outputs\.run_id/);
 assert.match(smoke,/timeout-minutes: 12/);
 assert.match(smoke,/xcrun simctl launch/);
 assert.doesNotMatch(smoke,/continue-on-error:\s*true/);
});
