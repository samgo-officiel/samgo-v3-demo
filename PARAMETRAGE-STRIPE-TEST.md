# SAMGO — activer Stripe Connect SANDBOX (mode test uniquement)

Mise à jour : 28 octobre 2026.

## Ce qui est déjà fait
- Compte Stripe connecté à ChatGPT : **environnement de test Samgo** (un compte Express TEST est créé et associé au chauffeur SAMGO approuvé, onboarding non terminé).
- Backend Supabase Edge Function `samgo-stripe-sandbox` déployé, **JWT utilisateur obligatoire**.
- Webhook `samgo-stripe-webhook` déployé ; il vérifie la signature Stripe HMAC et rejette tout évènement `livemode=true`.
- Endpoint webhook **créé dans Stripe en environnement test** : `https://tgwdycgwgfisuskxwkvk.supabase.co/functions/v1/samgo-stripe-webhook`.
- Base Supabase : `samgo_stripe_chauffeurs_test` et `samgo_stripe_paiements_test`, avec RLS ; aucun client ne peut écrire directement les statuts de paiement.
- Interface SAMGO client/chauffeur reliée aux fonctions de test ; aucune clé secrète insérée dans le site.
- Politique lancement : **0 % commission SAMGO, 100 % du tarif chauffeur avant frais et taxes**. Dans le flux de destination charge prévu, **les frais de traitement Stripe sont facturés à la plateforme**. Prévoir un financement de ces frais avant toute activation réelle.

## Ce qui manque pour activer les véritables essais SANDBOX

**Situation mise à jour :** les trois paramètres secrets TEST figurent maintenant dans Supabase, et aucun secret n'a été communiqué dans ChatGPT ou ajouté sur GitHub. Les étapes ci-dessous restent utiles en cas de rotation des clés, sans afficher leurs valeurs.

1. Ouvrir **Stripe Dashboard** avec l'environnement **test/sandbox Samgo**. Dans « Développeurs » / « Clés API », récupérer **uniquement la clé secrète TEST**, commençant par `sk_test_`. Ne jamais copier une clé `sk_live_`.
2. Dans Stripe, ouvrir les **webhooks en mode test**, retrouver l'URL `https://tgwdycgwgfisuskxwkvk.supabase.co/functions/v1/samgo-stripe-webhook`, puis afficher son **secret de signature**, commençant par `whsec_`.
3. Ouvrir le Dashboard du projet Supabase SAMGO : `https://supabase.com/dashboard/project/tgwdycgwgfisuskxwkvk`. Dans **Edge Functions → Secrets** (ou paramètres des fonctions), ajouter **trois variables d'environnement** :
   - `SAMGO_STRIPE_TEST_KEY` = la clé Stripe **`sk_test_`**.
   - `SAMGO_STRIPE_WEBHOOK_TEST_SECRET` = le secret du webhook Stripe de test **`whsec_`**.
   - `SAMGO_STRIPE_SANDBOX_ENABLED` = `true`.
4. Enregistrer les secrets dans Supabase. **Ne pas les coller dans ChatGPT, sur GitHub, dans les pages SAMGO ou dans un formulaire du site**.
5. Depuis deux comptes SAMGO distincts, préparer une demande fictive et un chauffeur approuvé en démo. Le chauffeur pourra ensuite ouvrir **Chauffeur → Gains → Configurer mon compte chauffeur Stripe TEST** et terminer son onboarding dans les pages **hébergées par Stripe**.
6. Le client choisit le chauffeur dans « Mes courses », puis utilise « Tester le paiement Stripe SANDBOX ». La page Checkout doit clairement indiquer **TEST** et n'accepter que des données de test Stripe. Ne jamais utiliser une vraie carte bancaire lors des essais.
7. Vérifier dans les deux comptes le statut `paye_test`, qui ne doit apparaître qu'après la confirmation webhook signée par Stripe. Tester aussi l'expiration, l'annulation et les erreurs.

## Sécurité / limites

- Les deux Edge Functions sont déployées et les noms des secrets de test figurent dans Supabase. Leurs valeurs ne peuvent pas être vérifiées via les accès de ChatGPT ; un essai de lien d'onboarding depuis SAMGO reste nécessaire.
- Aucune opération de paiement réel n'est autorisée par le code : seules les clés `sk_test_` sont acceptées, et les évènements `livemode=true` sont rejetés.
- Un paiement de test peut être créé seulement après une **connexion utilisateur**, une **sélection valide de chauffeur fictif** et un **compte chauffeur Stripe test complet**.
- La distance des annonces est manuelle ; ce prix est **fictif** et **jamais utilisable pour une facturation réelle**. Un tarif vérifié côté serveur, les assurances et la conformité sont des préalables au lancement.
- Le modèle 0 % de commission laisse les frais Stripe à la charge de SAMGO dans le flux conçu : on doit prévoir le coût réel et ses conséquences avant de proposer « 100 % » aux chauffeurs.
- Les comptes Stripe sont associés aux utilisateurs côté serveur ; les coordonnées bancaires et vérifications sont gérées par Stripe et ne doivent jamais transiter via SAMGO.
- Le retour de Stripe sur le site **n'est pas une preuve de paiement** ; seule la signature du webhook valide le statut.
- Les vérifications unitaires et simulations JavaScript ont été réalisées. **Aucun paiement Stripe sandbox de bout en bout n'a été exécuté** tant que le compte chauffeur Stripe test et les secrets manquent.
- La création d'un compte bancaire réel, les abonnements et les paiements live ne sont pas autorisés.

## Documentation

- https://docs.stripe.com/connect/destination-charges
- https://docs.stripe.com/connect/express-accounts
- https://docs.stripe.com/webhooks
- https://supabase.com/docs/guides/functions/secrets

## Diagnostic de la vérification du chauffeur fictif — 28 octobre 2026

**La liaison SAMGO → Stripe Connect est fonctionnelle et la déclaration du chauffeur a été soumise.** Stripe a refusé la vérification des données de test et exige leur correction, ou une procédure alternative de vérification de test. Le compte reste désactivé pour les paiements et virements fictifs. Il ne faut pas confondre `details_submitted` avec `charges_enabled` ou `payouts_enabled`.

La fonction Supabase Stripe TEST (version 9) renvoie maintenant `verification_state: "correction_required"` lorsque Stripe signale des erreurs de vérification. La rubrique **Chauffeur → Gains** doit afficher « données de test à corriger » et permettre de reprendre le formulaire Stripe, sans demander d'IBAN ou de pièce d'identité dans SAMGO.

Valeurs documentées par Stripe pour des scénarios de test : `individual.phone=0000000000` (validation de numéro dans l'API), `individual.dob=1901-01-01` et `individual.address.line1=address_full_match` avec une ville et un code postal valides. Ce sont des valeurs **sandbox uniquement** ; leur acceptation par l'interface française doit être vérifiée et aucun véritable document personnel ne doit être fourni pour cette simulation. Voir https://docs.stripe.com/connect/testing .

La création des prochains comptes de test utilise maintenant les contrôleurs Stripe Express (`controller.stripe_dashboard.type=express`, `controller.fees.payer=application`, `controller.losses.payments=application`) plutôt que l'ancien `type=express`. **Cette création nouvelle n'a pas encore été validée en bout de chaîne.**

Vérifications réalisées : projet Supabase sain, fonctions Stripe actives, tables Stripe TEST protégées par RLS, **une seule association de compte**, **zéro paiement**. La carte bancaire et les versements réels restent désactivés.
