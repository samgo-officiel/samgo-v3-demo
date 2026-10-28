'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/samgo-stripe-webhook/index.ts'),'utf8');
test('webhook accepte uniquement signature valide et événement TEST',()=>{
 assert.match(source,/validSignature\(raw,header\)/);
 assert.match(source,/crypto\.subtle\.sign\("HMAC"/);
 assert.match(source,/event\?\.livemode!==false/);
 assert.match(source,/session\.livemode!==false/);
 assert.match(source,/session\.id\.startsWith\("cs_test_"\)/);
});
test('webhook contrôle participant, montant, commission et statut payé',()=>{
 assert.match(source,/session\.payment_status!=="paid"/);
 assert.match(source,/record\.stripe_session_id!==session\.id/);
 assert.match(source,/Number\(session\.amount_total\)!==Number\(record\.montant_centimes\)/);
 assert.match(source,/record\.commission_centimes!==0/);
});
test('webhook ne rétrograde pas un paiement final et gère concurrence',()=>{
 assert.match(source,/record\.statut!=="checkout_ouvert"/);
 assert.match(source,/statut=eq\.checkout_ouvert/);
 assert.match(source,/updated\.length===0/);
 assert.match(source,/checkout\.session\.async_payment_succeeded/);
 assert.match(source,/checkout\.session\.async_payment_failed/);
 assert.match(source,/checkout\.session\.expired/);
});
