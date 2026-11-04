# SAMGO — Bilan technique et passation du 1er novembre 2026

**État : prototype de TEST, non autorisé pour des trajets ou paiements réels.** Aucun pourcentage de disponibilité ne peut être confirmé sans une recette intégrale sur serveur et deux appareils.

## Travaux réalisés sans intervention du propriétaire

- PR #23 (en attente de fusion) : récupération de compte plus robuste face aux doubles demandes, à l'annulation et aux erreurs d'envoi de courriel. Tests automatiques GitHub Actions verts.
- PR #24 (en attente de fusion) : messages envoyés sur réseau instable ; ne pas annoncer à tort un échec définitif ni inviter au doublon. Tests GitHub Actions verts.
- PR #25 (en attente de fusion) : empêcher deux publications TEST simultanées et ignorer l'ancien GPS après déconnexion ; trois tests supplémentaires. Tests GitHub Actions verts.
- Supabase SAMGO-V3 TEST : migration `samgo_test_indexes_annonces_chat_notifications_20261101` appliquée. **Cinq index vérifiés** pour annonces client, réponses chauffeur, suivi chauffeur, messages auteur et notifications destinataire. Le fichier SQL correspondant figure dans `supabase/sql/`.
- Contrôle RLS non destructif : sous le rôle `authenticated` avec un identifiant de compte fictif inconnu, aucune ligne visible dans annonces, choix, messagerie, notifications, paiements de test et candidatures (six lectures renvoient zéro). Sous `anon`, lecture des messages de TEST refusée par la base, ce qui est attendu. **Cela ne remplace pas un essai avec deux vrais comptes distincts**.
- Security Advisor Supabase : trois tables historiques avec RLS sans policy restent volontairement fermées ; protection des mots de passe compromis toujours désactivée. Ne pas ajouter de policy permissive par défaut.
- Stripe sandbox vérifié : un webhook TEST activé, zéro session Checkout TEST, deux comptes Connect non habilités à encaisser ni virer. Aucun flux LIVE activé.

## À effectuer par le propriétaire le 2 novembre (regroupé, sans transmettre de secret dans un chat)

1. **E-mails** : chez le fournisseur SMTP, révoquer la clé déjà divulguée, créer une clé neuve et la saisir uniquement dans Supabase Auth. Valider le domaine expéditeur et la bonne URL de redirection, puis tester confirmation et mot de passe oublié. Activer la protection des mots de passe compromis si disponible.
2. **Deux téléphones** : utiliser un compte client TEST et un compte chauffeur TEST distincts et approuvés, sans données personnelles fictivement présentées comme réelles. Vérifier GPS volontaire, demande fictive, réponse, sélection, messagerie, étape de suivi et fin. Tester hors réseau et déconnexion ; ne conduire aucune vraie course.
3. **Stripe TEST** : reprendre l'onboarding via Stripe officiel en sandbox, vérifier le compte connecté et le webhook signé ; ensuite uniquement tester Checkout et QR fictifs. Ne jamais fournir de clé Stripe, carte ou pièce d'identité dans GitHub / ChatGPT.
4. **Assurance et réglementation** : obtenir une confirmation écrite de l'assureur et un avis juridique adaptés à un chauffeur indépendant qui conduit la voiture du client. Sans ces validations, pas de pilote réel.
5. **Distribution** : après recette et conformité, préparer icônes, signatures, comptes Apple/Google, tests iOS/Android et fiches de stores ; publication uniquement sur autorisation explicite.

## Limites connues

- GPS précis et géocodage réel, itinéraires, notification push hors application, gestion et validation d'identité des chauffeurs, modération, parcours financier LIVE et gestion RGPD ne sont pas validés.
- Les tests automatiques utilisent beaucoup de mocks ; ils ne remplacent pas le serveur réel et deux véritables utilisateurs indépendants.
- Aucune fusion sur `main` ni publication de site/application dans cette session.
- Dépôt GitHub actuellement **public** ; ne jamais y mettre d'informations sensibles ni de secrets. Le passage en privé pourrait nécessiter une adaptation de l'hébergement.
