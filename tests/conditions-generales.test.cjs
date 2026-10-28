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

test('Contrôles effectifs et preuves avant courses réelles, sans prétendre déjà les avoir',()=>{
 assert.match(legal,/id="verifications"/);
 assert.match(legal,/vérification adaptée et licite de l'identité du chauffeur/);
 assert.match(legal,/contrôle du permis valide/);
 assert.match(legal,/contrôle documenté de l'existence, de la validité/);
 assert.match(legal,/journalisation horodatée des faits signalés/);
 assert.match(legal,/version des conditions présentées et acceptées/);
 assert.match(legal,/n'est pas une preuve qu'ils ont été exécutés/);
 assert.match(legal,/n'est pas une preuve qu'ils ont été exécutés/);
 assert.match(legal,/n'est pas une preuve qu'ils ont été exécutés/);
});
test('Recours seulement pour fautes prouvées du chauffeur, sans effacer les obligations SAMGO',()=>{
 assert.match(legal,/id="recours"/);
 assert.match(legal,/faute contractuelle ou professionnelle démontrée/);
 assert.match(legal,/Ce recours ne couvre pas les propres fautes de SAMGO/);
 assert.match(legal,/ne supprime aucun droit des clients ou des tiers/);
 assert.match(legal,/SAMGO répond de ses propres manquements/);
 assert.match(legal,/dès le premier signalement/);
});
test('Sommaire et identifiants du document cohérents',()=>{
 const ids=[...legal.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const [,anchor] of legal.matchAll(/<a href="#([^"]+)"/g))
  assert.ok(ids.includes(anchor),'Ancre sans section: '+anchor);
});
