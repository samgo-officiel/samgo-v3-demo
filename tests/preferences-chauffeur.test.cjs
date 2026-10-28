'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/preferences-chauffeur-test.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function boot(saved={},blocked=false){
 const memory=new Map(Object.entries(saved));
 const controls={sgRadius:{value:'30'},sgDemandSort:{value:'proximite'},sgDemandTextFilter:{value:''},sgRadiusValue:{textContent:''}};
 const counts={gps:0,render:0};
 const document={getElementById:id=>controls[id]||null,readyState:'complete',addEventListener(){}};
 const storage={
  getItem:k=>{if(blocked)throw Error('privacy');return memory.get(k)||null;},
  setItem:(k,v)=>{if(blocked)throw Error('privacy');memory.set(k,v);},
  removeItem:k=>{if(blocked)throw Error('privacy');memory.delete(k);}
 };
 const window={sgDemand:{radiusChanged(){counts.gps++;},sortChanged(){counts.render++;}}};
 vm.runInNewContext(source,{window,document,localStorage:storage,Set});
 return {api:window.sgDriverPrefs,controls,memory,counts};
}
test('restore un rayon et un ordre valides depuis ce téléphone',()=>{
 const s=boot({'samgo-test-radius-v1':'10','samgo-test-sort-v1':'tarif'});
 assert.equal(s.controls.sgRadius.value,'10');
 assert.equal(s.controls.sgDemandSort.value,'tarif');
 assert.equal(s.counts.gps,0);
});
test('ignore les préférences invalides sans activer le GPS',()=>{
 const s=boot({'samgo-test-radius-v1':'5000','samgo-test-sort-v1':'injection'});
 assert.equal(s.controls.sgRadius.value,'30');
 assert.equal(s.controls.sgDemandSort.value,'proximite');
 assert.equal(s.counts.gps,0);
});
test('enregistre uniquement rayon et tri, pas la position ni identité',()=>{
 const s=boot();
 s.controls.sgRadius.value='5';
 s.controls.sgDemandSort.value='trajet';
 s.api.save();
 assert.equal(s.memory.size,2);
 assert.equal(s.memory.get('samgo-test-radius-v1'),'5');
 assert.equal(s.memory.get('samgo-test-sort-v1'),'trajet');
 assert.doesNotMatch(source,/getCurrentPosition|watchPosition|sessionUser|fetch\(/);
});
test('aucun plantage si le stockage local est bloqué',()=>{
 const s=boot({},true);
 assert.doesNotThrow(()=>s.api.save());
 assert.doesNotThrow(()=>s.api.restore());
 assert.doesNotThrow(()=>s.api.reset());
});
test('réinitialiser les filtres ne collecte pas de données et remet les choix initiaux',()=>{
 const s=boot({'samgo-test-radius-v1':'5','samgo-test-sort-v1':'tarif'});
 s.api.reset();
 assert.equal(s.controls.sgRadius.value,'30');
 assert.equal(s.controls.sgDemandSort.value,'proximite');
 assert.equal(s.memory.size,0);
 assert.equal(s.counts.gps,1);
 assert.equal(s.counts.render,0,'la remise à zéro ne déclenche pas de second affichage');
});
test('version mobile inclut le module et un contrôle de remise à zéro',()=>{
 assert.match(html,/assets\/preferences-chauffeur-test\.js/);
 assert.match(html,/window\.sgDriverPrefs\.reset\(\)/);
});

test('la réinitialisation supprime aussi le filtre textuel sans le mémoriser',()=>{
 const x=boot();
 x.controls.sgDemandTextFilter.value='Bordeaux gare';
 x.controls.sgRadius.value='10';
 x.controls.sgDemandSort.value='trajet';
 x.api.save();
 assert.equal(x.memory.size,2);
 x.api.reset();
 assert.equal(x.controls.sgDemandTextFilter.value,'');
 assert.equal(x.controls.sgRadius.value,'30');
 assert.equal(x.controls.sgDemandSort.value,'proximite');
 assert.equal(x.memory.size,0);
});
