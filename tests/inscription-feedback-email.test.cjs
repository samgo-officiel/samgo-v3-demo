'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
test('le retour inscription ne promet pas un email pour un compte deja present',()=>{
 assert.match(html,/Demande traitée\. Si tu viens de créer un compte/);
 assert.match(html,/Si tu es déjà inscrit, appuie sur/);
 assert.doesNotMatch(html,/Inscription demandée\. Vérifie ta boîte e-mail et clique/);
});
