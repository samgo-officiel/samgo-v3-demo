# SAMGO — QR code Stripe TEST : essai à deux téléphones

**Statut : parcours technique disponible dans le code, test réel à deux appareils non encore effectué.** Aucun paiement réel, aucune course réelle.

## Préconditions bloquantes

1. Compte chauffeur de démonstration approuvé dans SAMGO.
2. Compte Stripe Express du chauffeur **en mode test** avec `charges_enabled=true` et `payouts_enabled=true`. Le compte actuellement associé a une vérification fictive refusée : il doit être corrigé dans l'onboarding Stripe TEST avant de poursuivre.
3. Webhook de sandbox correctement configuré côté Supabase et événement signé accepté. Vérifier le statut de la session, pas seulement la page de retour Stripe.
4. Deux téléphones connectés sur deux comptes distincts. Ne pas saisir de carte réelle ni de RIB ou pièces d'identité réels pendant le test.

## Parcours avec deux personnes

1. **Client (téléphone A) :** créer une simulation fictive de 5 à 20 km, publier une annonce TEST, choisir le chauffeur de test après sa réponse.
2. **Chauffeur (téléphone B) :** accepter l'annonce de test et constater sa sélection dans son espace.
3. **Client (téléphone A) :** dans « Mes courses », cliquer « Créer / afficher mon QR Stripe TEST ». Le serveur vérifie la course, le propriétaire et le compte Stripe Connect avant de créer une session Checkout en SANDBOX.
4. **Chauffeur (téléphone B) :** actualiser « Mes sélections », puis cliquer « Montrer le QR TEST au client ». Le QR n'apparaît qu'après création de la session par le client. Il est généré localement, sans transfert de l'URL vers un service QR tiers.
5. **Client (téléphone A) :** scanner avec l'appareil photo le QR affiché sur le téléphone du chauffeur. Contrôler que l'adresse ouverte commence par `https://checkout.stripe.com/`, que la page est bien en mode **TEST** et que le montant correspond à la simulation.
6. Effectuer le règlement uniquement avec un moyen de paiement de test documenté par Stripe (jamais une vraie carte).
7. Actualiser « Mes courses » côté client et « Mes sélections » côté chauffeur : le statut attendu est `paye_test` seulement après **webhook signé**.
8. Vérifier dans le tableau de paiement SAMGO que la commission est 0 % et qu'aucun paiement live n'a été créé.

## Échecs à tester

- Une URL Stripe d'un autre domaine ou une session `cs_live_` doit être refusée par la fenêtre de QR.
- Un compte tiers ne doit pas pouvoir obtenir le lien Checkout d'une course dont il n'est pas participant (RLS).
- La fermeture du QR ou la déconnexion efface le dessin et le lien de la fenêtre, sans prétendre annuler une session déjà créée chez Stripe.
- Un paiement annulé, échoué ou expiré ne doit pas apparaître comme confirmé.
- Réouvrir un Checkout en attente ne doit pas créer un second débit. Après paiement, l'application doit empêcher un second Checkout pour la même simulation.

## Limitations

Ce QR ouvre une **session Checkout Stripe TEST** ; ce n'est pas le QR code natif d'une borne de paiement ni un paiement réel. Sans compte chauffeur Stripe vérifié, la création de session est refusée et le QR n'apparaît pas.

La validation d'un parcours fictif ne permet pas de proposer une course payante réelle. Avant toute mise en circulation de personnes, vérifier la réglementation, les assurances du véhicule et de la conduite rémunérée, les identités/permis et les autres obligations de la plateforme.

Documentation Stripe : https://docs.stripe.com/testing et https://docs.stripe.com/connect/testing
