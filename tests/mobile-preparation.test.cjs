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
 }finally{
  fs.rmSync(output,{recursive:true,force:true});
 }
});
