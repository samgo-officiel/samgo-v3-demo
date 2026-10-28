-- SAMGO V3 — Agent facturation + signalements, simulation uniquement.
-- AUCUN e-mail, avertissement de production ou document fiscal émis.
create table if not exists public.samgo_signalements_test (
 id uuid primary key default gen_random_uuid(),
 trajet_id uuid not null references public.choix_chauffeur_test(id) on delete cascade,
 declarant_id uuid not null references auth.users(id) on delete cascade,
 cible_id uuid not null references auth.users(id) on delete cascade,
 categorie text not null check(categorie in ('comportement','absence','paiement','danger','agression','accident','autre')),
 details text not null check(char_length(btrim(details)) between 10 and 1500),
 statut text not null default 'en_attente' check(statut in ('en_attente','avertissement_valide','rejete')),
 cree_le timestamptz not null default now(),
 traite_le timestamptz,
 unique(trajet_id,declarant_id,cible_id),
 check(declarant_id <> cible_id)
);
alter table public.samgo_signalements_test enable row level security;
create policy samgo_signalements_deposant_insert on public.samgo_signalements_test
for insert to authenticated with check (
 declarant_id = (select auth.uid()) and statut='en_attente' and traite_le is null
 and exists (
  select 1 from public.choix_chauffeur_test c where c.id=trajet_id
  and ((c.client_id=declarant_id and c.chauffeur_id=cible_id)
    or (c.chauffeur_id=declarant_id and c.client_id=cible_id))
 )
);
create policy samgo_signalements_deposant_read on public.samgo_signalements_test
for select to authenticated using (declarant_id=(select auth.uid()));
create policy samgo_signalements_admin_read on public.samgo_signalements_test
for select to authenticated using (public.samgo_is_admin());
create policy samgo_signalements_admin_update on public.samgo_signalements_test
for update to authenticated using (public.samgo_is_admin())
with check (public.samgo_is_admin());
-- Blocage des modifications client, même avec accès table indirect.
create table if not exists public.samgo_notifications_test (
 id uuid primary key default gen_random_uuid(),
 destinataire_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(char_length(message) between 1 and 500),
 type text not null check(type in ('avertissement_test','escalade_test')),
 nombre_avertissements int not null check(nombre_avertissements between 1 and 999),
 cree_le timestamptz not null default now()
);
alter table public.samgo_notifications_test enable row level security;
create policy samgo_notifications_lire_ses_alertes on public.samgo_notifications_test
for select to authenticated using (destinataire_id=(select auth.uid()));
create policy samgo_notifications_admin_lire on public.samgo_notifications_test
for select to authenticated using (public.samgo_is_admin());

create table if not exists public.samgo_escalades_test (
 id uuid primary key default gen_random_uuid(),
 cible_id uuid not null unique references auth.users(id) on delete cascade,
 nombre_avertissements int not null check(nombre_avertissements >= 3),
 statut text not null default 'a_examiner' check(statut in ('a_examiner','en_cours','cloture')),
 cree_le timestamptz not null default now(),
 derniere_alerte_le timestamptz not null default now()
);
alter table public.samgo_escalades_test enable row level security;
create policy samgo_escalades_admin_lire on public.samgo_escalades_test
for select to authenticated using (public.samgo_is_admin());
create policy samgo_escalades_admin_modifier on public.samgo_escalades_test
for update to authenticated using (public.samgo_is_admin()) with check(public.samgo_is_admin());

-- Brouillon comptable strictement interne, créé seulement après confirmation Stripe TEST.
-- TVA non déterminée : le code n'a pas le droit d'inventer un taux.
create table if not exists public.samgo_factures_brouillons_test (
 id uuid primary key default gen_random_uuid(),
 choix_id uuid not null unique references public.samgo_stripe_paiements_test(choix_id) on delete cascade,
 client_id uuid not null references auth.users(id) on delete cascade,
 chauffeur_id uuid not null references auth.users(id) on delete cascade,
 montant_ttc_centimes integer not null check(montant_ttc_centimes between 100 and 100000),
 commission_centimes integer not null default 0 check(commission_centimes=0),
 tva_regime text not null default 'a_confirmer' check(tva_regime in ('a_confirmer','franchise_base','reel')),
 tva_taux_bp integer,
 tva_centimes integer,
 statut text not null default 'bloque_verifications' check(statut in ('bloque_verifications','pret_pour_validation','annule')),
 emission_autorisee boolean not null default false check(emission_autorisee=false),
 cree_le timestamptz not null default now(),
 check(tva_taux_bp is null or tva_taux_bp between 0 and 10000),
 check(tva_centimes is null or tva_centimes between 0 and montant_ttc_centimes)
);
alter table public.samgo_factures_brouillons_test enable row level security;
create policy samgo_factures_admin_read on public.samgo_factures_brouillons_test
for select to authenticated using (public.samgo_is_admin());
-- Aucun rôle non privilégié n'a de droit d'insertion/édition/suppression sur ces trois tables.
revoke all on public.samgo_notifications_test, public.samgo_escalades_test, public.samgo_factures_brouillons_test from anon, authenticated;
grant select on public.samgo_notifications_test to authenticated;
grant select on public.samgo_escalades_test, public.samgo_factures_brouillons_test to authenticated;

create or replace function samgo_internal.samgo_signalements_agent_test()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
 -- Seule une décision humaine valide crée un avertissement.
 if old.statut <> 'avertissement_valide' and new.statut='avertissement_valide' then
  select count(*) into n from public.samgo_signalements_test
  where cible_id=new.cible_id and statut='avertissement_valide';
  insert into public.samgo_notifications_test(destinataire_id,message,type,nombre_avertissements)
  values(new.cible_id,
   case when n>=3 then
    'SAMGO TEST : votre dossier nécessite un examen par le responsable. Contactez le support pour faire valoir vos observations.'
   else
    'SAMGO TEST : un avertissement a été validé après examen. Consultez le support pour demander des précisions ou contester.'
   end,
   case when n>=3 then 'escalade_test' else 'avertissement_test' end,
   greatest(n,1));
  if n>=3 then
   insert into public.samgo_escalades_test(cible_id,nombre_avertissements)
   values(new.cible_id,n)
   on conflict(cible_id) do update set
    nombre_avertissements=excluded.nombre_avertissements,
    derniere_alerte_le=now(),
    statut='a_examiner';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function samgo_internal.samgo_signalements_agent_test() from public, anon, authenticated;
create trigger samgo_signalements_agent_after_update
after update of statut on public.samgo_signalements_test
for each row execute function samgo_internal.samgo_signalements_agent_test();

create or replace function samgo_internal.samgo_facturation_test_en_attente()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if new.statut='paye_test' and (tg_op='INSERT' or old.statut is distinct from 'paye_test') then
  insert into public.samgo_factures_brouillons_test
   (choix_id, client_id, chauffeur_id, montant_ttc_centimes, commission_centimes)
  values(new.choix_id,new.client_id,new.chauffeur_id,new.montant_centimes,0)
  on conflict(choix_id) do nothing;
 end if;
 return new;
end;
$$;
revoke all on function samgo_internal.samgo_facturation_test_en_attente() from public, anon, authenticated;
create trigger samgo_facturation_test_on_paid
after insert or update of statut on public.samgo_stripe_paiements_test
for each row execute function samgo_internal.samgo_facturation_test_en_attente();
