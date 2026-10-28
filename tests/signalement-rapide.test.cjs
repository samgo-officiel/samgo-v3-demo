'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const site=fs.readFileSync(path.join(root,'index.html'),'utf8');
const aide=fs.readFileSync(path.join(root,'aide.html'),'utf8');
test('liens de signalement disponibles pour les deux profils sur mobile',()=>{
 const matches=site.match(/href="\.\/aide\.html#signaler"/g)||[];
 assert.equal(matches.length,2);
 assert.match(aide,/id="signaler"/);
});
test('mise en garde : la plateforme de test n est pas un service d urgence',()=>{
 assert.equal((site.match(/signale?ments non surveillés en permanence/g)||[]).length,2);
 assert.match(site,/danger immédiat, appelez le 112/);
});
test('aucune identité ou détail de course transmis dans les liens d incident',()=>{
 assert.doesNotMatch(site,/aide\.html\?client_id=/);
 assert.doesNotMatch(site,/aide\.html\?choix_id=/);
});
