'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const legal=read('conditions-generales.html');
const page=read('index.html');
const mobile=read('mobile/scripts/prepare-web.cjs');
test('Conditions générales SAMGO TEST disponibles depuis inscription et compte',()=>{
 assert.match(legal,/<title>SAMGO — Conditions générales du projet \(TEST\)<\/title>/);
 assert.match(page,/id="sgTermsLink"/);
 assert.match(page,/id="testAcknowledgement"[\s\S]*?conditions-generales\.html/);
 assert.match(page,/id="permisDeclare"[\s\S]*?conditions-generales\.html/);
 assert.match(page,/<footer>[\s\S]*?conditions-generales\.html/);
 assert.match(mobile,/['"]conditions-generales\.html['"]/);
});
test('Plateforme décrite sans clause de déresponsabilisation abusive',()=>{
 assert.match(legal,/plateforme numérique de mise en relation/);
 assert.match(legal,/chauffeurs professionnels indépendants/);
 assert.match(legal,/droits impératifs des consommateurs/);
 assert.match(legal,/responsable de ses obligations légales et contractuelles propres/);
 assert.doesNotMatch(legal,/SAMGO n'est responsable d'aucun dommage|aucune responsabilité.*SAMGO/i);
});
test('Assurance du client et du chauffeur adaptées à la conduite rémunérée',()=>{
 assert.match(legal,/assurance automobile obligatoire/);
 assert.match(legal,/chauffeur tiers rémunéré/);
 assert.match(legal,/assurance professionnelle adaptée/);
 assert.match(legal,/assurance habitation/);
 assert.match(legal,/ne remplace pas une assurance adaptée/);
});
test('Clauses non commerciales et informations entreprise non inventées',()=>{
 assert.match(legal,/non immatriculée/);
 assert.match(legal,/aucune prestation réelle/);
 assert.match(legal,/DOCUMENT DE TRAVAIL/);
 assert.match(legal,/SIREN\/SIRET/);
 assert.match(legal,/droit de rétractation/);
 assert.match(legal,/médiateur compétent/);
 assert.match(legal,/modalités de classement/);
});
