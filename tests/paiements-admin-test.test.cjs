'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const sql=read('supabase/sql/agent-paiements-admin-test.sql');
const admin=read('samgo-admin 2.html');
const agent=read('assets/admin-agents-test.js');
const checkout=read('supabase/functions/samgo-stripe-sandbox/index.ts');
const webhook=read('supabase/functions/samgo-stripe-webhook/index.ts');

test('suivi paiements: lecture admin sans permission de modification client',()=>{
 assert.match(sql,/enable row level security/);
 assert.match(sql,/for select to authenticated/);
 assert.match(sql,/public\.samgo_is_admin\(\)/);
 assert.match(sql,/revoke insert,update,delete,truncate/);
 assert.doesNotMatch(sql,/grant\s+(insert|update|delete)\b/i);
});
test('administration: nouveau panneau visible seulement pour admin et lecture de colonnes minimales',()=>{
 assert.match(admin,/id="sgAgentPaymentsPanel" class="panel hidden"/);
 assert.match(admin,/id="sgAgentPayments"/);
 assert.match(admin,/id="sgAgentPaymentCount"/);
 assert.match(admin,/\['sgAgentUrgentPanel','sgAgentEscalationsPanel','sgAgentReportsPanel','sgAgentInvoicesPanel','sgAgentPaymentsPanel'\]/);
 assert.match(agent,/privateRead\('samgo_stripe_paiements_test','choix_id,montant_centimes,commission_centimes,statut,cree_le'\)/);
 assert.doesNotMatch(agent,/privateRead\('samgo_stripe_paiements_test',[^\n]+(?:checkout_url|stripe_session_id|client_id|chauffeur_id)/);
});
test('total test affiche sans le présenter comme revenus, frais et paiements réels',()=>{
 assert.match(agent,/function drawPayments\(rows\)/);
 assert.match(agent,/rows\.filter\(r=>r\.statut==='paye_test'\)/);
 assert.match(agent,/100 dernières maximum/);
 assert.match(agent,/Aucun revenu réel/);
 assert.match(agent,/frais Stripe/);
 assert.match(admin,/Aucun encaissement réel/);
});
test('les paiements restent Stripe SANDBOX avec webhooks signés et contrôle du montant',()=>{
 assert.match(checkout,/stripeKey\.startsWith\("sk_test_"\)/);
 assert.match(checkout,/session\.id\.startsWith\("cs_test_"\)/);
 assert.match(webhook,/validSignature\(raw,header\)/);
 assert.match(webhook,/event\?\.livemode!==false/);
 assert.match(webhook,/Number\(session\.amount_total\)!==Number\(record\.montant_centimes\)/);
 assert.match(webhook,/statut=eq\.checkout_ouvert/);
});
