'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','assets','carte-proximite-test.js'),'utf8');

class Element {
 constructor(tag){this.tag=tag;this.attrs={};this.children=[];this.style={};this.textContent='';}
 setAttribute(key,value){this.attrs[key]=String(value);}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
}
function start(){
 const container=new Element('div');
 const document={
  getElementById:id=>id==='sgNearbyMap'?container:null,
  createElementNS:(namespace,tag)=>{
   assert.equal(namespace,'http://www.w3.org/2000/svg');
   return new Element(tag);
  }
 };
 const window={};
 vm.runInNewContext(source,{document,window});
 return {map:window.sgProximityMap,container};
}
const center={lat:48.85,lng:2.35};
const rows=[
 {id:'north',latitude_approx:48.9,longitude_approx:2.35,approach:5.5},
 {id:'east',latitude_approx:48.85,longitude_approx:2.4,approach:3.7}
];
test('schéma affiché, marqueurs au nord et à l’est, accessible',()=>{
 const {map,container}=start();
 map.render({center,requests:rows,radius:10});
 assert.equal(container.children.length,1);
 const svg=container.children[0];
 assert.equal(svg.tag,'svg');assert.equal(svg.attrs.role,'img');
 const markers=svg.children.filter(e=>e.tag==='g');
 assert.equal(markers.length,2);
 const north=markers[0].children.find(e=>e.tag==='circle');
 const east=markers[1].children.find(e=>e.tag==='circle');
 assert.ok(Number(north.attrs.cy)<170,'le nord doit être vers le haut');
 assert.ok(Number(east.attrs.cx)>170,'l’est doit être à droite');
});
test('arrêter efface toutes les données visuelles',()=>{
 const {map,container}=start();
 map.render({center,requests:rows,radius:10});
 map.clear();
 assert.equal(container.children.length,0);
});
test('coordonnées corrompues et distances hors rayon ignorées',()=>{
 const {map,container}=start();
 map.render({center,requests:[
  {latitude_approx:'erreur',longitude_approx:2,approach:5},
  {latitude_approx:48.9,longitude_approx:2.3,approach:20}
 ],radius:10});
 assert.equal(container.children[0].children.filter(e=>e.tag==='g').length,0);
});
test('carte purement locale et aucune coordonnée affichée en texte',()=>{
 const {map,container}=start();
 map.render({center,requests:rows,radius:10});
 const svg=container.children[0];
 const flatten=node=>[node.textContent,...node.children.flatMap(flatten)].join(' ');
 const visibleText=flatten(svg);
 assert.ok(!visibleText.includes('48.85'));
 assert.ok(!visibleText.includes('2.35'));
 assert.match(svg.attrs['aria-label'],/schéma/i);
});
test('un rayon invalide ne dessine pas de carte',()=>{
 const {map,container}=start();
 map.render({center,requests:rows,radius:0});
 assert.equal(container.children.length,0);
});
