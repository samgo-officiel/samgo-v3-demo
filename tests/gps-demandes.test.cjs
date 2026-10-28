'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','assets','demandes-geoloc-test.js'),'utf8');
function boot({approved=true,fetchRequests}={}){
 const nodes=new Map(),prompts=[];
 class Element {
  constructor(id){this.id=id;this.textContent='';this.value=id==='sgRadius'?'30':'';this.checked=false;this.disabled=true;
   this.hidden=true;this.children=[];this.attrs={};}
  replaceChildren(){this.children=[];}
  append(...args){this.children.push(...args);}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(){}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
 const document={getElementById:get,createElement:tag=>new Element(tag),
   addEventListener(){},visibilityState:'visible'};
 const navigator={geolocation:{getCurrentPosition(ok,fail,opts){prompts.push({ok,fail,opts});}}};
 const sessionUser={id:'driver-A'};
 let calls=0;
 const client={
  testRequests:{list:async (position,radius)=>{calls++;return fetchRequests?
    fetchRequests(position,radius):{data:[],error:null};}},
  testReplies:{list:async()=>({data:[],error:null})}
 };
 const window={isSecureContext:true};
 vm.runInNewContext(source,{
  window,document,navigator,sessionUser,client,driverSimAllowed:approved,
  driverTab(){},setInterval(){return 1;},clearInterval(){},Date,Math,Number,
  Intl,Set,Promise,Error
 },{filename:'SAMGO-GPS'});
 return {geo:window.sgDemand,prompts,sessionUser,get,calls:()=>calls,
  giveGPS:(accuracy=30,measuredAt=Date.now())=>{
   const prompt=prompts.shift();
   assert.ok(prompt,'une demande GPS doit exister');
   prompt.ok({coords:{latitude:48.8566,longitude:2.3522,accuracy},timestamp:measuredAt});
  }};
}
test('permission GPS requise uniquement via action et compte chauffeur approuvé',async()=>{
 const x=boot({approved:false});
 await x.geo.open();
 assert.equal(x.prompts.length,0);
 assert.match(x.get('sgGeoStatus').textContent,/approuvé/i);
});
test('l’arrêt avant la réponse GPS annule les données et les appels serveur',async()=>{
 const x=boot();
 const pending=x.geo.open();
 assert.equal(x.prompts.length,1);
 x.geo.stop();
 x.giveGPS();
 await pending;
 assert.equal(x.calls(),0);
 assert.equal(x.get('sgGeoStop').disabled,true);
});
test('position valable : recherche et précision GPS affichée',async()=>{
 const x=boot();const pending=x.geo.open();
 x.giveGPS(42);
 await pending;
 assert.equal(x.calls(),1);
 assert.match(x.get('sgGeoStatus').textContent,/42 m/);
 assert.equal(x.get('sgGeoStop').disabled,false);
});
test('changer le rayon déclenche une nouvelle recherche',async()=>{
 const x=boot();const pending=x.geo.open();x.giveGPS();await pending;
 x.get('sgRadius').value='50';
 x.geo.radiusChanged();
 await Promise.resolve();await Promise.resolve();
 assert.equal(x.calls(),2);
 assert.equal(x.get('sgRadiusValue').textContent,'50 km');
});
test('le changement de compte invalide la permission GPS en cours',async()=>{
 const x=boot();const pending=x.geo.open();
 x.sessionUser.id='driver-B';
 x.giveGPS();
 await pending;
 assert.equal(x.calls(),0);
});
test('une ancienne mesure GPS ne peut pas être réutilisée',async()=>{
 const x=boot();const pending=x.geo.open();
 x.giveGPS(30,Date.now()-16*60*1000);
 await pending;
 assert.equal(x.calls(),0);
 assert.match(x.get('sgGeoStatus').textContent,/15 minutes/i);
});
test('une position GPS incohérente est rejetée',async()=>{
 const x=boot();const pending=x.geo.open();
 x.prompts.shift().ok({coords:{latitude:220,longitude:3},timestamp:Date.now()});
 await pending;
 assert.equal(x.calls(),0);
 assert.match(x.get('sgGeoStatus').textContent,/invalide/i);
});
