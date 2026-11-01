-- Les index de cette migration ont été appliqués dans SAMGO-V3 TEST le 01/11/2026.
-- Cette copie conserve la trace du changement ; aucun accès RLS n'est ouvert.
create index if not exists samgo_annonces_test_client_recent_idx
on public.annonces_raccompagnement_test (client_id, cree_le desc);
create index if not exists samgo_reponses_test_chauffeur_recent_idx
on public.reponses_annonces_test (chauffeur_id, cree_le desc);
create index if not exists samgo_notifications_test_destinataire_recent_idx
on public.samgo_notifications_test (destinataire_id, cree_le desc);
create index if not exists samgo_suivi_course_test_chauffeur_idx
on public.suivi_course_test (chauffeur_id);
create index if not exists samgo_messages_test_auteur_idx
on public.messages_course_test (auteur_id);
