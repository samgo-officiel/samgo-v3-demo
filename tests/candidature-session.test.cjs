'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const code=html.match(/async function applyDriver\(\)\{[\s\S]*?\n\}\nasync function signOut\(/);
assert.ok(code,'Candidature chauffeur introuvable');
const candidateFunction=code[0].slice(0,-'\nasync function signOut('.length);
function boot(){
 let resolveInsert,insertCount=0,refreshCount=0;
 const elements={
  nomAffiche:{value:'Chauffeur Test'},
  permisDeclare:{checked:true},
  applyBtn:{disabled:false}
 };
 let log=[];
 const client={from(name){
  assert.equal(name,'candidatures_chauffeur');
  return {insert(data){
   insertCount++;
   return new Promise(resolve=>{resolveInsert=()=>resolve({error:null});});
  }};
 }};
 const context={
  client,sessionUser:{id:'driver-A'},
  driverApplyAttempt:0,driverApplyPendingUser:null,
  $:id=>elements[id]||(elements[id]={disabled:false}),
  setStatus:(id,text,level)=>{log.push({id,text,level});},
  errText:error=>error?.message||'erreur',
  refreshCandidate:async()=>{refreshCount++;}
 };
 vm.runInNewContext(candidateFunction+'\nthis.applyDriver=applyDriver;',context);
 return {context,elements,log:()=>log,insertCount:()=>insertCount,
  refreshCount:()=>refreshCount,resolve:()=>{assert.ok(resolveInsert);resolveInsert();}};
}
test('double soumission de candidature ne crée pas une deuxième demande',async()=>{
 const x=boot();
 const p=x.context.applyDriver();
 await x.context.applyDriver();
 assert.equal(x.insertCount(),1);
 x.resolve();await p;
 assert.equal(x.refreshCount(),1);
 assert.match(x.log().at(-1).text,/Candidature de test enregistrée/);
});
test('ancien formulaire chauffeur ne remet pas de statut après changement de compte',async()=>{
 const x=boot();
 const p=x.context.applyDriver();
 x.context.sessionUser.id='driver-B';
 x.context.driverApplyAttempt++;
 x.context.driverApplyPendingUser=null;
 x.log().length=0;
 x.resolve();await p;
 assert.equal(x.refreshCount(),0);
 assert.equal(x.log().length,0);
});
test('un refus de contrat fictif bloque la soumission',async()=>{
 const x=boot();
 x.elements.permisDeclare.checked=false;
 await x.context.applyDriver();
 assert.equal(x.insertCount(),0);
 assert.match(x.log().at(-1).text,/Confirme/);
});
