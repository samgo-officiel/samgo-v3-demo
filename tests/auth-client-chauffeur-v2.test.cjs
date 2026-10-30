'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const recovery=fs.readFileSync('assets/recuperation-compte-test.js','utf8');
const match=html.match(/function authPageTitle\(\)\{[\s\S]*?\n\}/);
assert.ok(match);
function title(space,authMode,sessionUser=null){
 return vm.runInNewContext(match[0]+'\nauthPageTitle()', {space,authMode,sessionUser});
}
test('un même compte est présenté côté client ou chauffeur',()=>{
 assert.equal(title('chauffeur','signin'),title('raccompagner','signin'));
 assert.match(title('chauffeur','signin'),/Connexion SAMGO/);
 assert.equal(title('chauffeur','signup'),title('raccompagner','signup'));
});
test('les informations de connexion ne font plus croire à deux comptes séparés',()=>{
 assert.match(html,/Un même compte SAMGO fonctionne pour les espaces client et chauffeur/);
 assert.ok(html.includes("if(changed&&$('authStatus'))setStatus('authStatus','')"));
});
test('les erreurs de quota e-mail indiquent que le nouveau lien n est pas envoyé',()=>{
 assert.match(recovery,/Limite d.e-mails SAMGO atteinte/);
 assert.match(recovery,/Aucun nouveau lien n.a été envoyé/);
});
