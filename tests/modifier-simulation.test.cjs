'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function editLocalDemo(){');
const end=html.indexOf('function resetLocalDemo(){',start);
assert.ok(start!==-1&&end>start,'Fonction Modifier ma simulation introuvable');
const source=html.slice(start,end);
function boot(simulation){
 const nodes={
  demoDepart:{value:'',focus(){this.focused=true;}},
  demoArrivee:{value:''},
  km:{value:'10',options:[5,10,15,20].map(n=>({value:String(n)}))},
  demoBookingMessage:{textContent:''}
 };
 let route=null,calculated=0;
 const ctx={
  localDemoRequest:simulation,
  $:id=>nodes[id],
  sgGo:view=>{route=view;},
  calc:()=>{calculated++;}
 };
 vm.runInNewContext(source+';this.editLocalDemo=editLocalDemo;',ctx);
 return {run:()=>ctx.editLocalDemo(),nodes,route:()=>route,calc:()=>calculated};
}
test('modifier une simulation locale recharge les champs sans réservation réelle',()=>{
 const app=boot({from:'Place imaginaire',to:'Maison fictive',km:15,status:'waiting'});
 app.run();
 assert.equal(app.nodes.demoDepart.value,'Place imaginaire');
 assert.equal(app.nodes.demoArrivee.value,'Maison fictive');
 assert.equal(app.nodes.km.value,'15');
 assert.equal(app.route(),'book');
 assert.equal(app.calc(),1);
 assert.match(app.nodes.demoBookingMessage.textContent,/ne modifie pas une annonce déjà publiée/);
 assert.equal(app.nodes.demoDepart.focused,true);
});
test('aucune simulation, aucune modification ni changement de page',()=>{
 const app=boot(null);
 app.run();
 assert.equal(app.route(),null);
 assert.equal(app.calc(),0);
});
test('la nouvelle action est visible dans le suivi client et n envoie aucun GPS',()=>{
 assert.match(html,/onclick="editLocalDemo\(\)"/);
 assert.doesNotMatch(source,/getCurrentPosition|watchPosition|fetch\(|\.create\(/);
});
