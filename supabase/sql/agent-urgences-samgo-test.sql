-- SAMGO V3 — file interne de sécurité pour signalements graves TEST.
-- Ne divulgue jamais le déclarant à la personne visée et ne suspend aucun compte.
create table if not exists public.samgo_urgences_test (
 id uuid primary key default gen_random_uuid(),
 signalement_id uuid not null unique references public.samgo_signalements_test(id) on delete cascade,
 cible_id uuid not null references auth.users(id) on delete cascade,
 categorie text not null check (categorie in ('danger','agression','accident')),
 statut text not null default 'a_examiner' check (statut in ('a_examiner','en_cours','cloture')),
 cree_le timestamptz not null default now(),
 traite_le timestamptz
);
alter table public.samgo_urgences_test enable row level security;
revoke all on public.samgo_urgences_test from anon,authenticated;
grant select,update on public.samgo_urgences_test to authenticated;
create policy samgo_urgences_test_admin_lecture on public.samgo_urgences_test
 for select to authenticated using ((select public.samgo_is_admin()));
create policy samgo_urgences_test_admin_suivi on public.samgo_urgences_test
 for update to authenticated using ((select public.samgo_is_admin()))
 with check ((select public.samgo_is_admin()));

create or replace function samgo_internal.samgo_detecter_urgence_test()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if new.categorie in ('danger','agression','accident') then
  insert into public.samgo_urgences_test(signalement_id,cible_id,categorie)
  values(new.id,new.cible_id,new.categorie)
  on conflict(signalement_id) do nothing;
 end if;
 return new;
end;
$$;
revoke all on function samgo_internal.samgo_detecter_urgence_test() from public,anon,authenticated;
create trigger samgo_signalement_grave_file_test
 after insert on public.samgo_signalements_test
 for each row execute function samgo_internal.samgo_detecter_urgence_test();
-- Aucun envoi e-mail, SMS, push, aucun ban automatique.
