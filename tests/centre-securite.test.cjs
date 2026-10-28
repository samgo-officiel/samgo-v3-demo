'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const safety=fs.readFileSync(path.join(root,'securite.html'),'utf8');
const main=fs.readFileSync(path.join(root,'index.html'),'utf8');
const native=fs.readFileSync(path.join(root,'mobile/scripts/prepare-web.cjs'),'utf8');
test('urgence ouverte uniquement sur clic volontaire, sans appel automatique',()=>{
 assert.match(safety,/href="tel:112"/);
 assert.match(safety,/href="tel:17"/);
 assert.match(safety,/n'assure|n'y a pas de centrale d'urgence|pas de centrale d'urgence/);
 assert.doesNotMatch(safety,/<script\b/i);
 assert.doesNotMatch(safety,/fetch\(|getCurrentPosition|watchPosition/);
});
test('le signalement existe sans prétendre être surveillé 24h/24',()=>{
 assert.match(safety,/href="\.\/aide\.html#signaler"/);
 assert.match(safety,/ne sont pas surveillés en permanence/);
 assert.match(safety,/aucune course réelle/i);
});
test('accès sécurité depuis le menu et compte SAMGO',()=>{
 assert.match(main,/id="sgSafetyLink"/);
 assert.match(main,/id="sg-menu-panel"[\s\S]{0,620}href="\.\/securite\.html"/);
});
test('la page de sécurité est embarquée pour Android et iPhone',()=>{
 assert.match(native,/pages=\[[^\]]*'securite.html'/);
});
