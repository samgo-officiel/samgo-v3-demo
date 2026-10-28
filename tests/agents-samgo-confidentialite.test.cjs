'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sql=read('supabase/sql/agent-factures-signalements-test.sql');
const perms=read('supabase/sql/agent-signalements-privileges-test.sql');
const admin=read('samgo-admin 2.html');
const agent=read('assets/admin-agents-test.js');
const aide=read('aide.html');
const inbox=read('mes-alertes.html');
const native=read('mobile/scripts/prepare-web.cjs');
test('RLS: un signalement ne vise que le client ou chauffeur de son trajet',()=>{
 assert.match(sql,/declarant_id = \(select auth\.uid\(\)\)/);
 assert.match(sql,/c\.client_id=declarant_id and c\.chauffeur_id=cible_id/);
 assert.match(sql,/c\.chauffeur_id=declarant_id and c\.client_id=cible_id/);
 assert.match(sql,/samgo_signalements_admin_update/);
 assert.match(sql,/statut='en_attente'/);
 assert.match(perms,/revoke all on public\.samgo_signalements_test from anon, authenticated/);
});
test('le compte visé ne peut pas voir identité ou texte du signalement',()=>{
 assert.match(sql,/destinataire_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/samgo_signalements_deposant_read/);
 assert.match(sql,/declarant_id=\(select auth\.uid\(\)\)/);
 assert.doesNotMatch(sql,/create policy.*cible_id=\(select auth\.uid\(\)\)/i);
 assert.match(inbox,/select:'message,type,nombre_avertissements,cree_le'/);
 assert.doesNotMatch(inbox,/declarant_id|details|reporter_id/);
});
test('escalade uniquement après trois avertissements VALIDÉS par administrateur',()=>{
 assert.match(sql,/old\.statut <> 'avertissement_valide' and new\.statut='avertissement_valide'/);
 assert.match(sql,/where cible_id=new\.cible_id and statut='avertissement_valide'/);
 assert.match(sql,/if n>=3 then/);
 assert.match(sql,/samgo_escalades_test/);
 assert.match(agent,/Valider 1 avertissement TEST/);
 assert.match(agent,/access\.isAdmin\(\)===true/);
 assert.doesNotMatch(sql,/suspendu|bannissement|delete from auth\.users/i);
});
test('facturation: brouillon uniquement si paiement test confirmé; TVA et e-mails bloqués',()=>{
 assert.match(sql,/if new\.statut='paye_test'/);
 assert.match(sql,/tva_regime text not null default 'a_confirmer'/);
 assert.match(sql,/emission_autorisee boolean not null default false check\(emission_autorisee=false\)/);
 assert.match(sql,/on conflict\(choix_id\) do nothing/);
 assert.match(agent,/Zéro facture fiscale émise/);
 assert.doesNotMatch(agent,/fetch\(.*send-mail|emails\.send|resend\.com/i);
});
test('écrans participants + admin liés, nettoyage des sorties et version mobile',()=>{
 assert.match(aide,/id="sgConfidentialReport"/);
 assert.match(aide,/sgMatchedTrips\.get\(trajet\)/);
 assert.match(aide,/samgo_signalements_test/);
 assert.match(admin,/window\.sgAdminAgentsTest\.init\(\{getToken,request,notice,isAdmin:/);
 assert.match(native,/'mes-alertes.html'/);
 assert.match(read('index.html'),/id="sgConfidentialAlertsLink"/);
 assert.match(agent,/\.textContent=item\.details/);
});
