-- SAMGO — paiements Stripe TEST : lecture reservee aux participants et a l'admin.
-- Maintien des permissions restrictives: aucun INSERT / UPDATE / DELETE depuis les navigateurs.
-- Permet a l'administrateur de voir un suivi sans devoiler les paiements a des tiers.
alter table public.samgo_stripe_paiements_test enable row level security;
create policy samgo_paiements_admin_lecture_test
on public.samgo_stripe_paiements_test
for select to authenticated
using ((select public.samgo_is_admin()));
-- Aucune permission d'ecriture ne doit etre ouverte aux navigateurs.
revoke insert,update,delete,truncate on public.samgo_stripe_paiements_test from anon,authenticated;
