'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../assets/effacer-local-test.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function boot(approve=true){
 let resetPrefs=0,resetDemo=0;
 const status={textContent:''};
 const win={confirm:()=>approve,sgDriverPrefs:{reset(){resetPrefs++;}}};
 const document={getElementById:id=>id==='sgLocalClearStatus'?status:null};
 const ctx={window:win,document,resetLocalDemo(){resetDemo++;}};
 vm.runInNewContext(src,ctx);
 return {run:win.sgLocalClearTest.clear,status,
  calls:()=>({prefs:resetPrefs,demo:resetDemo})};
}
test('nettoyage ne part pas sans confirmation',()=>{
 const x=boot(false);
 assert.equal(x.run(),false);
 assert.deepEqual(x.calls(),{prefs:0,demo:0});
});
test('nettoyage efface simulation et preferences, sans toucher compte ni GPS',()=>{
 const x=boot();
 assert.equal(x.run(),true);
 assert.deepEqual(x.calls(),{prefs:1,demo:1});
 assert.match(x.status.textContent,/annonces.*pas été supprimés/);
 assert.doesNotMatch(src,/signOut|sessionStorage|removeUser|testRequests\.remove|geolocation|fetch\(/);
});
test('nettoyage accessible depuis Mon compte',()=>{
 assert.match(html,/assets\/effacer-local-test\.js/);
 assert.match(html,/sgLocalClearTest\.clear\(\)/);
});
