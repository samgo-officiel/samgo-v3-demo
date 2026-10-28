'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../supabase/functions/samgo-stripe-sandbox/index.ts'),'utf8');
test('Checkout TEST: jamais de paiement live ni carte/IBAN collecté par SAMGO',()=>{
 assert.match(src,/stripeKey\.startsWith\("sk_test_"\)/);
 assert.match(src,/json\?\.livemode === true/);
 assert.match(src,/cs_test_/);
 assert.doesNotMatch(src,/payment_method_types\[0\]/);
 assert.doesNotMatch(src,/sk_live_[A-Za-z0-9]{15,}/);
});
test('seul un chauffeur Stripe vérifié peut démarrer un Checkout TEST',()=>{
 assert.match(src,/requireApprovedDriver/);
 assert.match(src,/if\(!connected\.charges_enabled \|\| !connected\.payouts_enabled \|\| connected\.livemode===true\)/);
 assert.match(src,/status==="paye_test"/);
 assert.match(src,/samgo_demo_checkout_v1_/);
});
test('le client ne fixe pas le montant et SAMGO ne prend aucune commission',()=>{
 assert.match(src,/const distance=Number\(ad\.distance_km\)/);
 assert.match(src,/const amount=distance\*100/);
 assert.match(src,/commission_centimes:0/);
 assert.match(src,/transfer_data\]\[destination/);
});
