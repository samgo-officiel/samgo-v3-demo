-- Agent SAMGO TEST : supprimer les privilèges implicites non nécessaires.
revoke all on public.samgo_signalements_test from anon, authenticated;
grant select, insert, update on public.samgo_signalements_test to authenticated;
-- RLS bloque les éditions par les déclarants : seuls les administrateurs valident.
-- Client/chauffeur ne peut que consulter ses propres signalements.
