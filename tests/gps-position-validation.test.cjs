'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('assets/demandes-geoloc-test.js','utf8');
const start=source.indexOf('function normalizePosition(p){');
const end=source.indexOf('\nfunction requestLocation()',start);
assert.ok(start>=0&&end>start,'La fonction de validation GPS est présente');
const normalize=vm.runInNewContext(source.slice(start,end)+'\nnormalizePosition');

test('une réponse GPS sans coordonnées ne devient jamais un faux point 0,0',()=>{
 for(const p of [
  {coords:{latitude:null,longitude:null}},
  {coords:{latitude:43.2,longitude:null}},
  {coords:{latitude:null,longitude:-1.1}},
  {coords:{}},
  {},
  {coords:{latitude:'43.2',longitude:'-1.1'}}
 ])assert.throws(()=>normalize(p),/Position GPS invalide/);
});
test('coordonnées hors limites et valeurs non finies rejetées',()=>{
 for(const [latitude,longitude] of [[91,0],[-91,0],[0,181],[0,-181],[Infinity,1],[1,NaN]])
  assert.throws(()=>normalize({coords:{latitude,longitude}}),/Position GPS invalide/);
});
test('position valide et précision sont conservées localement sans arrondir le GPS du chauffeur',()=>{
 const p=normalize({coords:{latitude:43.29481,longitude:-0.37015,accuracy:65},timestamp:Date.now()});
 assert.equal(p.lat,43.29481);assert.equal(p.lng,-0.37015);
 assert.equal(p.accuracy,65);
});
test('une date GPS dans le futur ne permet pas de garder une localisation éternellement',()=>{
 const before=Date.now();
 const p=normalize({coords:{latitude:43.2,longitude:-0.3,accuracy:20},timestamp:Date.now()+86400000});
 assert.ok(p.measuredAt>=before&&p.measuredAt<=Date.now());
});
test('les coordonnées 0,0 sont acceptées seulement si le capteur retourne explicitement des nombres',()=>{
 const p=normalize({coords:{latitude:0,longitude:0,accuracy:100}});
 assert.equal(p.lat,0);assert.equal(p.lng,0);
});
