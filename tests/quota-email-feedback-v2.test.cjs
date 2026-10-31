'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const match=html.match(/function errText\(error\)\{[^\n]*\}/);
assert.ok(match,'Gestion des erreurs Auth requise');
const message=error=>vm.runInNewContext(match[0]+';errText(error);',{error});
test('429 envoi email ne fait pas croire que le client a échoué son inscription',()=>{
 const result=message({message:'email rate limit exceeded',code:'over_email_send_rate_limit'});
 assert.match(result,/côté serveur/);
 assert.match(result,/Aucun nouvel e-mail/);
 assert.doesNotMatch(result,/Trop de tentatives/);
});
test('problème de mot de passe et limitation non SMTP restent distincts',()=>{
 assert.match(message({message:'invalid login credentials'}),/mot de passe incorrect/);
 assert.match(message({message:'rate limit exceeded',code:'over_request_rate_limit'}),/Limite temporaire de requêtes/);
});
test('un email non autorise indique clairement que le serveur SMTP manque',()=>{
  const msg=message({message:'Email address not authorized',code:'email_address_not_authorized'});
  assert.match(msg,/SMTP externe/);
  assert.doesNotMatch(msg,/mot de passe incorrect/);
});
test('un echec du SMTP est traduit en francais',()=>{
  assert.match(message({message:'Error sending confirmation email'}),/paramétrage SMTP/);
});
