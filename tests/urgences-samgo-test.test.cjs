'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const sql=read('supabase/sql/agent-urgences-samgo-test.sql');
const guards=read('supabase/sql/verrouillage-dossiers-samgo-test.sql');
const html=read('samgo-admin 2.html');
const ui=read('assets/admin-agents-test.js');

test('une plainte grave est mise en file dès sa création, sans attendre les trois avertissements',()=>{
 assert.match(sql,/after insert on public\.samgo_signalements_test/);
 assert.match(sql,/new\.categorie in \('danger','agression','accident'\)/);
 assert.match(sql,/on conflict\(signalement_id\) do nothing/);
 assert.doesNotMatch(sql,/nombre_avertissements\s*>=\s*3|if\s+n\s*>=\s*3/);
});
test('les urgences restent confidentielles et modifiables seulement par un administrateur',()=>{
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.samgo_urgences_test from anon,authenticated/);
 assert.match(sql,/using \(\(select public\.samgo_is_admin\(\)\)\)/);
 assert.doesNotMatch(sql,/declarant_id|reporter_id/);
 assert.match(guards,/grant update\(statut,traite_le\) on public\.samgo_urgences_test/);
 assert.match(guards,/grant update\(statut,traite_le\) on public\.samgo_signalements_test/);
 assert.match(guards,/grant update\(statut\) on public\.samgo_escalades_test/);
});
test('administrateur: bouton prendre en charge et cloturer sans suspension automatique',()=>{
 assert.match(html,/id="sgAgentUrgentPanel"/);
 assert.match(html,/id="sgAgentUrgentCases"/);
 assert.match(ui,/privateRead\('samgo_urgences_test'/);
 assert.match(ui,/drawUrgencies\(urgencies\)/);
 assert.match(ui,/Prendre en charge/);
 assert.match(ui,/Clôturer après examen/);
 assert.match(ui,/item\.statut==='a_examiner'&&next==='en_cours'/);
 assert.match(ui,/item\.statut==='en_cours'&&next==='cloture'/);
 assert.doesNotMatch(ui,/banUser|suspendUser|deleteUser/);
});
