-- SAMGO TEST — limiter les modifications depuis le navigateur aux seuls champs de traitement.
-- Ni la personne concernée, ni l'auteur de la plainte, ni le montant d'un dossier
-- ne peuvent être modifiés en changeant le corps d'une requête.
revoke update on public.samgo_signalements_test from authenticated;
grant update(statut,traite_le) on public.samgo_signalements_test to authenticated;
revoke update on public.samgo_urgences_test from authenticated;
grant update(statut,traite_le) on public.samgo_urgences_test to authenticated;
revoke update on public.samgo_escalades_test from authenticated;
grant update(statut) on public.samgo_escalades_test to authenticated;
