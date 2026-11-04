-- SAMGO TEST — proposition de migration à relire, NE PAS exécuter automatiquement.
-- Prévenir qu'un client remplace le chauffeur ou l'annonce après avoir choisi
-- un prestataire, ou qu'un choix terminé redevienne modifiable.
-- Avant déploiement : vérifier tests SQL/RLS sur une base de staging non publique.
--
-- OBSERVÉ le 04-11-2026 : les politiques RLS UPDATE limitent les statuts
-- et le propriétaire, mais n'interdisent pas individuellement l'altération
-- des colonnes annonce_id, chauffeur_id, reponse_id, cree_le, etc.
-- Le déclencheur ci-dessous apporte une protection indépendante des champs.
--
-- Délibérément pas de mises à jour de données, pas d'accès service_role,
-- pas de compte utilisateur et pas de changement de politique Auth.

begin;

create or replace function public.samgo_verrouiller_choix_test()
returns trigger
language plpgsql
set search_path = ''
as $samgo$
begin
  if new.id is distinct from old.id
     or new.annonce_id is distinct from old.annonce_id
     or new.reponse_id is distinct from old.reponse_id
     or new.client_id is distinct from old.client_id
     or new.chauffeur_id is distinct from old.chauffeur_id
     or new.cree_le is distinct from old.cree_le
  then
    raise exception 'Les participants et les références de la simulation sont immuables.'
      using errcode = '23514';
  end if;

  -- Seules deux transitions sont autorisées, une unique fois :
  -- choisi_test -> termine_test OU choisi_test -> annule_test.
  if old.statut <> 'choisi_test'
     or new.statut not in ('termine_test', 'annule_test')
  then
    raise exception 'Transition de simulation non autorisée.'
      using errcode = '23514';
  end if;

  if new.statut = 'annule_test' and new.termine_le is not null then
    raise exception 'Une simulation annulée ne possède pas d’heure de fin.'
      using errcode = '23514';
  end if;

  if new.statut = 'termine_test'
     and (new.termine_le is null
          or new.termine_le < old.cree_le
          or new.termine_le > now() + interval '1 minute') then
    raise exception 'Date de fin de simulation incohérente.'
      using errcode = '23514';
  end if;

  return new;
end;
$samgo$;

drop trigger if exists samgo_verrouiller_choix_test_trigger on public.choix_chauffeur_test;
create trigger samgo_verrouiller_choix_test_trigger
before update on public.choix_chauffeur_test
for each row execute function public.samgo_verrouiller_choix_test();

commit;
