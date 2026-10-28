'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const fn=html.match(/async function signOut\(\)\{[\s\S]*?\n\}\ncalc\(\)/);
assert.ok(fn,'Fonction de déconnexion introuvable');
const source=fn[0].slice(0,-'\ncalc()'.length);
function boot(){
 const cleared=[];
 let resolveRevoke,networkResolved=false;
 const remote=new Promise(resolve=>{resolveRevoke=()=>{networkResolved=true;resolve();};});
 const session={id:'user-test'};
 const client={auth:{signOut:()=>{
  cleared.push('session locale');
  return remote;
 }}};
 const window={
  sgLoyaltyTest:{stop:()=>cleared.push('fidélité')},
  sgReviews:{clear:()=>cleared.push('avis')},
  sgStripeSandbox:{reset:()=>cleared.push('Stripe TEST')},
  sgDemand:{stop:(args)=>{assert.equal(args.clearClient,true);cleared.push('GPS');}},
  sgChatTest:{stop:()=>cleared.push('messagerie')}
 };
 const ctx={
  client,window,sessionUser:session,
  sgUserRefreshSequence:0,driverApplyAttempt:0,driverApplyPendingUser:'user-test',
  localDemoRequest:{id:'local'},driverSimAllowed:true,driverSimActive:true,
  saveLocalDemo:()=>cleared.push('stockage local'),
  renderLocalDemo:()=>cleared.push('simulation locale'),
  updateDriverSimulation:()=>cleared.push('simulation chauffeur'),
  setStatus:(_id,text)=>cleared.push(text),
  refreshUser:async()=>{cleared.push('vérification UI');},
  Promise
 };
 vm.runInNewContext(source+'\nthis.perform=signOut;',ctx);
 return {ctx,cleared,networkResolved:()=>networkResolved,finishRemote:resolveRevoke};
}
test('déconnexion réinitialise les écrans sans attendre un réseau qui répond lentement',async()=>{
 const app=boot();
 await app.ctx.perform();
 assert.equal(app.networkResolved(),false,'la révocation réseau est toujours en attente');
 assert.equal(app.ctx.sessionUser,null);
 for(const name of ['session locale','fidélité','avis','Stripe TEST','GPS','messagerie','Déconnecté.'])
  assert.ok(app.cleared.includes(name),'Panneau non purgé: '+name);
 assert.equal(app.ctx.driverSimAllowed,false);
 app.finishRemote();
});
