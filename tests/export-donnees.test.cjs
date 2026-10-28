'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'..','assets/export-donnees-test.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function boot(options={}){
 const user={id:'user-A'};
 const clipboard=[];
 const messageLog={textContent:''};
 const exportButton={disabled:false};
 const manual={hidden:true},manualJson={value:''};
 const nodes={sgMyDataStatus:messageLog,sgMyDataExport:exportButton,
  sgMyDataManual:manual,sgMyDataManualJson:manualJson};
 const document={getElementById:id=>nodes[id]||null};
 const accountRows=[
  {id:'adA',client_id:'user-A',depart_test:'Lieu fictif',destination_test:'Maison fictive',latitude_approx:44.123456},
  {id:'adB',client_id:'user-B',depart_test:'Secret d autre utilisateur'}
 ];
 const choices=[
  {id:'cA',client_id:'user-A',chauffeur_id:'driver-X',statut:'termine_test'},
  {id:'cB',client_id:'user-B',chauffeur_id:'driver-Y',statut:'termine_test'}
 ];
 const msgs={
  cA:[{id:'mA',choix_id:'cA',auteur_id:'driver-X',contenu:'Test sans adresse',cree_le:'2026-10-28'},
      {id:'mB',choix_id:'cB',auteur_id:'user-B',contenu:'MESSAGE INTERDIT'}],
  cB:[{id:'mSecret',choix_id:'cB',auteur_id:'user-B',contenu:'SECRET'}]
 };
 let release=null;
 const waiting=new Promise(resolve=>{release=resolve;});
 const client={
  testRequests:{mine:async()=>options.waitAds?waiting:{data:accountRows,error:null}},
  testChoices:{list:async()=>({data:choices,error:null})},
  testReviews:{list:async()=>({data:[
   {choix_id:'cA',note:5,commentaire:'Bien'},
   {choix_id:'cB',note:1,commentaire:'AVIS AUTRE COMPTE'}
  ],error:null})},
  testTracking:{list:async()=>({data:[{choix_id:'cA',etape:'arrive_test'}],error:null})},
  testPayments:{list:async()=>({data:[{choix_id:'cA',statut:'paye_test'},{choix_id:'cB',statut:'INTERDIT'}],error:null})},
  testMessages:{list:async id=>({data:msgs[id]||[],error:null})}
 };
 const navigator={clipboard:options.clipboard===false?undefined:
  {writeText:async text=>{clipboard.push(text);}}};
 const win={Capacitor:{isNativePlatform:()=>true},navigator};
 vm.runInNewContext(script,{window:win,document,sessionUser:user,client,navigator,Date,JSON,Map,Set,Promise,Blob,URL},
  {filename:'SAMGO-private-export'});
 return {api:win.sgMyDataTest,user,client,clipboard,status:messageLog,
  manual,manualJson,button:exportButton,release};
}
test('export partiel filtre les autres utilisateurs et n inclut pas le GPS ni jetons',async()=>{
 const t=boot();
 const data=await t.api.collect('user-A',()=>true);
 assert.equal(data.annonces.length,1);
 assert.equal(data.simulations.length,1);
 assert.equal(data.messages.length,1);
 assert.equal(data.avis.length,1);
 assert.equal(data.paiements_fictifs.length,1);
 const content=JSON.stringify(data);
 assert.doesNotMatch(content,/MESSAGE INTERDIT|AVIS AUTRE COMPTE|Secret d autre utilisateur/);
 assert.doesNotMatch(content,/latitude_approx|access_token|refresh_token|password|RIB/i);
 assert.match(data.avertissement,/PARTIEL/);
});
test('export natif demande un clic et copie seulement quand utilisateur connecté',async()=>{
 const t=boot();
 assert.equal(t.clipboard.length,0);
 assert.equal(await t.api.exportFile(),true);
 assert.equal(t.clipboard.length,1);
 assert.match(t.status.textContent,/copié/);
 assert.equal(t.button.disabled,false);
});
test('une déconnexion pendant la lecture interdit le retour des données privées',async()=>{
 const t=boot({waitAds:true});
 const pending=t.api.exportFile();
 t.api.reset();
 t.user.id='user-B';
 t.release({data:[{id:'adA',client_id:'user-A'}],error:null});
 assert.equal(await pending,false);
 assert.equal(t.clipboard.length,0);
 assert.match(t.status.textContent,/Connectez-vous/);
});
test('filtre de choix refuse les simulations appartenant à un tiers',()=>{
 const t=boot();
 assert.equal(t.api.eligibleChoice({client_id:'user-B',chauffeur_id:'driver-Y'},'user-A'),false);
 assert.equal(t.api.eligibleChoice({client_id:'user-B',chauffeur_id:'user-A'},'user-A'),true);
});
test('bouton de compte charge son module et la déconnexion purge l export',()=>{
 assert.match(html,/id="sgMyDataExport"/);
 assert.match(html,/assets\/export-donnees-test\.js/);
 assert.match(html,/sgMyDataTest\.reset\(\)/);
});

test('iPhone sans presse papiers affiche export manuel puis le purge a deconnexion',async()=>{
 const t=boot({clipboard:false});
 assert.equal(await t.api.exportFile(),true);
 assert.equal(t.manual.hidden,false);
 assert.match(t.manualJson.value,/EXPORT PARTIEL/);
 assert.equal(t.clipboard.length,0);
 t.api.reset();
 assert.equal(t.manual.hidden,true);
 assert.equal(t.manualJson.value,'');
});
