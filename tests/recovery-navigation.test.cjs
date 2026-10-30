'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('assets/recuperation-compte-test.js','utf8');
test('le retour depuis Gmail ouvre directement Compte',()=>{
 assert.match(src,/if\(isPending\(\)\)\{\s*if\(typeof sgGo==='function'\)sgGo\('account'\)/);
 assert.match(src,/passwordField\.focus\(\)/);
});
