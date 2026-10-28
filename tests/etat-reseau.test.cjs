'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'assets/etat-reseau-test.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function boot(connected){
 const handlers={};
 const label={hidden:true,textContent:''};
 const navigator={onLine:connected};
 const window={addEventListener:(name,fn)=>handlers[name]=fn};
 const document={readyState:'complete',getElementById:id=>id==='sgNetworkOffline'?label:null,
  addEventListener(){}};
 vm.runInNewContext(src,{window,document,navigator});
 return {label,navigator,handlers};
}
test('hors ligne : information affichée sans GPS ni requête réseau',()=>{
 const x=boot(false);
 assert.equal(x.label.hidden,false);
 assert.match(x.label.textContent,/Hors connexion/);
});
test('retour en ligne : bannière masquée',()=>{
 const x=boot(false);
 x.navigator.onLine=true;
 x.handlers.online();
 assert.equal(x.label.hidden,true);
});
test('connexion initiale : aucun avertissement inutile',()=>{
 const x=boot(true);
 assert.equal(x.label.hidden,true);
});
test('l’interface et le script de connexion sont chargés',()=>{
 assert.match(html,/id="sgNetworkOffline"/);
 assert.match(html,/src="assets\/etat-reseau-test\.js\?/);
 assert.doesNotMatch(src,/getCurrentPosition|fetch\(|getAccessToken|sessionStorage/);
});
