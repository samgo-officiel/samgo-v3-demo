'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const hotspot=fs.readFileSync('assets/carte-chaleur-chauffeur-test.js','utf8');
const availability=fs.readFileSync('assets/chauffeurs-disponibles-test.js','utf8');
const html=fs.readFileSync('index.html','utf8');
function hotspotModule(){
 const window={};
 vm.runInNewContext(hotspot,{window,document:{getElementById(){return null;}},navigator:{},Promise,Map,Set});
 return window.sgDriverHotmap;
}
function availModule(){
 const window={};
 vm.runInNewContext(availability,{window,document:{getElementById(){return null;}},navigator:{},Promise});
 return window.sgAvailableDrivers;
}
const now=Date.parse('2026-11-01T20:00:00Z');
const ad=(id,client,lat,lng,opts={})=>({
 id,client_id:client,latitude_approx:lat,longitude_approx:lng,
 statut:'test_en_attente',expire_le:new Date(now+3600000).toISOString(),...opts
});
test('demande isolée : jamais de zone chaude révélant un client',()=>{
 const zones=hotspotModule().aggregateRequests([ad('a','clientA',43.3,-0.3)],now);
 assert.equal(zones.length,0);
});
test('deux clients : jamais assez de densité pour rendre leur zone visible',()=>{
 const zones=hotspotModule().aggregateRequests([
  ad('a','clientA',43.301,-0.301),ad('b','clientB',43.302,-0.303)
 ],now);
 assert.equal(zones.length,0);
});
test('plusieurs annonces du même client ne créent pas artificiellement une zone',()=>{
 const zones=hotspotModule().aggregateRequests([
  ad('a','clientA',43.301,-0.301),ad('b','clientA',43.302,-0.303),
  ad('c','clientB',43.303,-0.302)
 ],now);
 assert.equal(zones.length,0);
});
test('trois clients distincts dans une zone 0,1 degré : une seule zone agrégée',()=>{
 const zones=hotspotModule().aggregateRequests([
  ad('a','clientA',43.301,-0.301),ad('b','clientB',43.302,-0.303),
  ad('c','clientC',43.303,-0.302)
 ],now);
 assert.equal(zones.length,1);
 assert.equal(zones[0].count,3);
 assert.equal(zones[0].lat,43.35);
 assert.equal(zones[0].lng,-0.35);
 assert.notEqual(zones[0].lat,43.301);
});
test('annonces expirées, non ouvertes et invalides exclues des zones',()=>{
 const bad=[
  ad('a','A',43.301,-0.301,{expire_le:new Date(now-1).toISOString()}),
  ad('b','B',43.301,-0.301,{statut:'test_annulee'}),
  ad('c','C',null,-0.31),
  ad('d','D',91,0),
  ad('e',null,43.3,-0.3)
 ];
 assert.equal(hotspotModule().aggregateRequests(bad,now).length,0);
});
test('filtre des chauffeurs : position récente et zone GPS valide uniquement',()=>{
 const recent=new Date(now-60000).toISOString();
 const old=new Date(now-32*60000).toISOString();
 const rows=[
  {name:'Sam',position:{latitude_approx:43.31,longitude_approx:-0.3,actualise_le:recent}},
  {name:'Ancien',position:{latitude_approx:43.31,longitude_approx:-0.3,actualise_le:old}},
  {name:'Vide',position:{latitude_approx:null,longitude_approx:-0.3,actualise_le:recent}},
  {name:'Loin',position:{latitude_approx:48.8,longitude_approx:2.2,actualise_le:recent}}
 ];
 const out=availModule().safeRows(rows,{lat:43.3,lng:-0.3},now);
 assert.equal(out.length,1);
 assert.equal(out[0].name,'Sam');
 assert.match(out[0].band,/0 à 5 km/);
 assert.equal(out[0].lat,undefined);
 assert.equal(out[0].lng,undefined);
});
test('les distances publiées sont des tranches, jamais des mètres ou GPS précis',()=>{
 const b=availModule().band;
 assert.equal(b(1.47),'à environ 0 à 5 km');
 assert.equal(b(13),'à environ 10 à 20 km');
 assert.equal(b(43),'à environ 30 à 50 km');
});
test('les deux fonctionnalités sont déclarées dans le site et nécessitent un clic',()=>{
 assert.match(html,/id="sgDriverHotmapRecorded"/);
 assert.match(html,/window\.sgDriverHotmap\.showRecorded\(\)/);
 assert.match(html,/id="sgAvailableDriversRun"/);
 assert.match(html,/window\.sgAvailableDrivers\.refresh\(\)/);
 assert.match(html,/assets\/chauffeurs-disponibles-test\.js\?v=/);
 assert.match(html,/const availableDrivers=\{/);
 assert.match(html,/positions_chauffeurs_test\?select=/);
 assert.match(html,/offres_chauffeurs\?select=/);
 assert.match(hotspot,/approvedDriver\(\)/);
 assert.doesNotMatch(availability,/watchPosition|sessionStorage|localStorage|console\.log/);
});
