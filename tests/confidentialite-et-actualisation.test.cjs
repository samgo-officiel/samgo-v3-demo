'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const home=read('index.html'),help=read('aide.html'),notice=read('donnees-test.html');
test('informations de confidentialité accessibles depuis Compte et Aide',()=>{
 assert.match(home,/href="\.\/donnees-test\.html"/);
 assert.match(help,/href="\.\/donnees-test\.html"/);
 assert.match(notice,/href="\.\/index\.html"/);
});
test('la confidentialité n’affirme pas une suppression des annonces après 2 heures',()=>{
 assert.match(notice,/automatiquement supprimé/);
 assert.match(notice,/quinze|15 minutes/i);
 assert.match(notice,/deux décimales/);
 assert.match(notice,/pas encore une politique de confidentialité juridique complète/);
});
test('la page d’information reste statique et non indexable',()=>{
 assert.match(notice,/<meta name="robots" content="noindex">/);
 assert.doesNotMatch(notice,/<script(?:\s|>)/i);
 assert.doesNotMatch(notice,/<form(?:\s|>)/i);
 assert.doesNotMatch(notice,/https?:\/\/[a-z]/i);
});
test('un cycle automatique ne relit pas les avis client deux fois',()=>{
 const refresh=read('assets/actualisation-test.js');
 const matches=[...refresh.matchAll(/await window\.sgReviews\.refreshClient\(/g)];
 assert.equal(matches.length,0,'sgDemand.refreshClient charge déjà les avis via sgReviews');
 assert.match(refresh,/await window\.sgDemand\.refreshClient\(/);
});
