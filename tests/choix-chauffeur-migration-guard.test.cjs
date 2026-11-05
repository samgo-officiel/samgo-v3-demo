'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sql = fs.readFileSync('supabase/sql/PROPOSITION-verrouiller-choix-chauffeur-test-2026-11-04.sql','utf8');

test('la migration TEST refuse les modifications des colonnes métier et futures', () => {
  assert.match(sql, /to_jsonb\(new\) - 'statut' - 'termine_le'/);
  assert.match(sql, /to_jsonb\(old\) - 'statut' - 'termine_le'/);
  assert.match(sql, /is distinct from/);
  assert.match(sql, /before update on public\.choix_chauffeur_test/i);
});

test('seules les transitions terminales TEST sont prévues', () => {
  assert.match(sql, /old\.statut <> 'choisi_test'/);
  assert.match(sql, /new\.statut not in \('termine_test', 'annule_test'\)/);
  assert.match(sql, /new\.termine_le is distinct from old\.termine_le/);
  assert.match(sql, /new\.termine_le > now\(\) \+ interval '1 minute'/);
});

test('migration proposée, sans exécution ni désactivation de RLS', () => {
  assert.match(sql, /NE PAS exécuter automatiquement/);
  assert.doesNotMatch(sql, /disable row level security|set role service_role|stripe.*live/i);
});
