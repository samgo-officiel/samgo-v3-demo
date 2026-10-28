'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const publicFiles=['index.html','aide.html','donnees-test.html','hors-ligne.html',
 ...fs.readdirSync(path.join(root,'assets')).filter(name=>name.endsWith('.js')).map(name=>'assets/'+name)];
// Empêche les erreurs les plus courantes dans ce dépôt public.
// Ne détecte pas tous les secrets et ne remplace pas une revue de sécurité.
const patterns=[
 {name:'Clé privée Stripe',pattern:/\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/g},
 {name:'Clé secrète Supabase',pattern:/\bsb_secret_[A-Za-z0-9_-]{16,}\b/g},
 {name:'Token GitHub classique',pattern:/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g},
 {name:'Token accès GitHub raffiné',pattern:/\bgithub_pat_[A-Za-z0-9_]{40,}\b/g}
];
test('les ressources publiques ne contiennent aucune clé privée au format connu',()=>{
 for(const file of publicFiles){
  const contents=fs.readFileSync(path.join(root,file),'utf8');
  for(const entry of patterns){
   entry.pattern.lastIndex=0;
   assert.equal(entry.pattern.test(contents),false,entry.name+' trouvée dans '+file);
  }
 }
});
test('les exemples Supabase du navigateur utilisent uniquement une clé publique',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/sb_publishable_/);
 assert.doesNotMatch(html,/sb_secret_[A-Za-z0-9_-]{16,}/);
});
