'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','assets','messages-rapides-test.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function setup(){
 const containers={},fields={},statuses={},events=[];
 for(const role of ['client','driver']){
  const name=role==='client'?'Client':'Driver';
  const containerId='sgChat'+name+'Quick';
  const inputId='sgChat'+name+'Input';
  const statusId='sgChat'+name+'Status';
  containers[containerId]={
   children:[],
   replaceChildren(...items){this.children=items;},
   append(item){this.children.push(item);},
   querySelectorAll(){return this.children;}
  };
  fields[inputId]={value:'',disabled:true,dispatchEvent:e=>events.push(e.type),
   focus(){this.focused=true;}};
  statuses[statusId]={textContent:''};
 }
 function createElement(tag){
  return {tag,disabled:false,textContent:'',listeners:{},
   addEventListener(event,fn){this.listeners[event]=fn;},
   setAttribute(name,val){this[name]=val;}};
 }
 const nodes={...containers,...fields,...statuses};
 const document={readyState:'complete',getElementById:id=>nodes[id]||null,createElement};
 const window={};
 vm.runInNewContext(source,{window,document,Event:class{constructor(type){this.type=type;}}});
 return {api:window.sgQuickReplyTest,nodes,events};
}
test('six réponses rapides construites sans envoi automatique',()=>{
 const p=setup();
 assert.equal(p.nodes.sgChatClientQuick.children.length,3);
 assert.equal(p.nodes.sgChatDriverQuick.children.length,3);
 assert.doesNotMatch(source,/testMessages\.create|fetch\(|getCurrentPosition/);
});
test('réponse rapide impossible avant ouverture de conversation',()=>{
 const p=setup();
 assert.equal(p.api.use('driver',0),false);
 assert.equal(p.nodes.sgChatDriverInput.value,'');
 p.api.setEnabled('driver',false);
 assert.equal(p.nodes.sgChatDriverQuick.children[0].disabled,true);
});
test('réponse insérée seulement avec compte et conversation autorisés',()=>{
 const p=setup();
 p.nodes.sgChatDriverInput.disabled=false;
 p.api.setEnabled('driver',true);
 assert.equal(p.api.use('driver',1),true);
 assert.match(p.nodes.sgChatDriverInput.value,/Je suis en route \(TEST\)/);
 assert.deepEqual(p.events,['input']);
 assert.equal(p.nodes.sgChatDriverInput.focused,true);
});
test('préserve le brouillon existant sans dépasser 500 caractères',()=>{
 const p=setup();
 const input=p.nodes.sgChatClientInput;
 input.disabled=false;
 p.api.setEnabled('client',true);
 input.value='Message en cours';
 assert.equal(p.api.use('client',1),true);
 assert.match(input.value,/^Message en cours Merci/);
 input.value='x'.repeat(490);
 assert.equal(p.api.use('client',0),false);
 assert.equal(input.value.length,490);
 assert.match(p.nodes.sgChatClientStatus.textContent,/maximum 500/);
});
test('page mobile relie les deux groupes et le module sans publication',()=>{
 assert.match(html,/id="sgChatClientQuick"/);
 assert.match(html,/id="sgChatDriverQuick"/);
 assert.match(html,/assets\/messages-rapides-test\.js/);
 assert.doesNotMatch(source,/\.send\(|checkout\(|window\.location\.assign/);
});
