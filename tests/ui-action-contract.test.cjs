'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const modules={
 sgDemand:'assets/demandes-geoloc-test.js',
 sgJourneyV2:'assets/parcours-v2-test.js',
 sgReviews:'assets/avis-chauffeurs-test.js',
 sgChatTest:'assets/messagerie-test.js',
 sgStripeDemo:'assets/stripe-connect-demo.js',
 sgStripeSandbox:'assets/stripe-sandbox-connexion.js',
 sgInstallTest:'assets/installation-mobile-test.js',
 sgLoyaltyTest:'assets/fidelite-test.js',
 sgDeviceCheck:'assets/diagnostic-appareil-test.js',
 sgGpsLocalTest:'assets/gps-diagnostic-local-test.js',
 sgClientDriverMap:'assets/carte-chauffeurs-client-test.js',
 sgDriverHotmap:'assets/carte-chaleur-chauffeur-test.js',
 sgAvailableDrivers:'assets/chauffeurs-disponibles-test.js',
 sgDriverPrefs:'assets/preferences-chauffeur-test.js',
 sgPasswordPreview:'assets/afficher-mot-de-passe-test.js',
 sgMyDataTest:'assets/export-donnees-test.js',
 sgLocalClearTest:'assets/effacer-local-test.js',
 sgDriverDocsTest:'assets/dossier-chauffeur-test.js'
};
function exportsFor(global,file){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const expression=new RegExp('window\\.'+global+'\\s*=\\s*\\{([^}]*)\\}');
 const match=source.match(expression);
 assert.ok(match,'Export global '+global+' absent de '+file);
 return new Set(match[1].split(',').map(x=>x.trim().split(':')[0].trim()).filter(Boolean));
}
test('les boutons et sélecteurs de la page appellent des fonctions exportées',()=>{
 let checked=0;
 const cache=Object.fromEntries(Object.entries(modules).map(([key,file])=>[key,exportsFor(key,file)]));
 for(const [,handler] of html.matchAll(/\s(?:onclick|onchange|onsubmit)="([^"]*)"/g)){
  for(const [,global,method] of handler.matchAll(/window\.(sg\w+)\.(\w+)\s*\(/g)){
   assert.ok(cache[global],global+' non déclaré pour '+handler);
   assert.ok(cache[global].has(method),global+'.'+method+' introuvable dans '+modules[global]);
   checked++;
  }
 }
 assert.ok(checked>=10,'Au moins 10 interactions doivent être vérifiées');
});
test('le bouton des avis chauffeur appelle le module des avis',()=>{
 assert.ok(html.includes('onclick="window.sgReviews.refreshDriver()"'));
 assert.ok(!html.includes('window.sgDemand.refreshDriverReviews()'));
});
test('diagnostic téléphone et carte GPS ont leur script chargé',()=>{
 assert.match(html,/<script src="assets\/diagnostic-appareil-test\.js\?[^"]+"><\/script>/);
 assert.match(html,/<script src="assets\/carte-proximite-test\.js\?[^"]+"><\/script>/);
 assert.match(html,/id="sgDeviceReport"/);
 assert.match(html,/id="sgNearbyMap"/);
});
