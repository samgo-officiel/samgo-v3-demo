'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
for(const kind of ['confirmation','recovery']){
 test('modèle e-mail '+kind+' : lien natif Supabase et aucune fuite de jeton',()=>{
   const html=fs.readFileSync('supabase/email-templates/'+kind+'.html','utf8');
   assert.match(html,/<html lang="fr">/);
   assert.match(html,/href="\{\{ \.ConfirmationURL \}\}"/);
   assert.match(html,/SAMGO TEST/);
   assert.doesNotMatch(html,/<script|<img|password\s*=|access_token\s*=|refresh_token\s*=/i);
   assert.doesNotMatch(html,/https?:\/\/[^" ]+/i,
     'pas de tracking externe, l URL réelle est injectée par Supabase à l envoi');
 });
}