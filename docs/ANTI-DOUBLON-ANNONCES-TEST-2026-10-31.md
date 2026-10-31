# SAMGO — garde anti-doublons des annonces TEST (31/10/2026)

**Appliqué au projet Supabase `SAMGO-V3` le 31 octobre 2026.** Le système reste strictement un prototype TEST ; ne pas l'utiliser pour de véritables trajets.

## Pourquoi
Deux requêtes simultanées peuvent passer la vérification préalable dans l'interface. Une contrainte d'exclusion PostgreSQL empêche désormais deux annonces `test_en_attente` du même client dont les périodes se chevauchent.

## SQL exécuté avec migration contrôlée
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
ALTER TABLE public.annonces_raccompagnement_test
  ADD CONSTRAINT annonces_test_sans_chevauchement_client
  EXCLUDE USING gist (
    client_id WITH =,
    tstzrange(cree_le, expire_le, '[)') WITH &&
  )
  WHERE (statut = 'test_en_attente');
```

Le contrôle préalable a montré **0 chevauchement préexistant**. Après application : contrainte `convalidated = true` dans `pg_constraint`. Les anciens créneaux expirés restent compatibles avec de nouvelles demandes; les annonces annulées n'entrent pas dans cette exclusion.

## Traitement côté interface
Le code `assets/demandes-geoloc-test.js` traduit l'erreur PostgreSQL `23P01` en indication compréhensible; il ne doit pas exposer les noms de contraintes.

## Réversibilité en cas de problème
```sql
ALTER TABLE public.annonces_raccompagnement_test
  DROP CONSTRAINT IF EXISTS annonces_test_sans_chevauchement_client;
```
Ne pas supprimer automatiquement l'extension btree_gist : elle peut servir à d'autres objets. Une vérification finale avec deux téléphones et deux vrais comptes TEST reste obligatoire avant un lancement.
