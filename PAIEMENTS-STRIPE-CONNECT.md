# SAMGO — intégration Stripe Connect (préparation, SANS paiement réel)

Mise à jour : 28 octobre 2026.


## Avancement Stripe Connect SANDBOX — 28 octobre 2026

- **Compte Stripe de test SAMGO connecté à ChatGPT** (compte Express TEST existant associé à un chauffeur approuvé ; onboarding à terminer).
- **Deux fonctions Supabase déployées** : `samgo-stripe-sandbox` (onboarding chauffeur et Checkout test, JWT obligatoire) et `samgo-stripe-webhook` (signature Stripe vérifiée).
- **Webhook créé chez Stripe en sandbox** pour les événements Checkout. Il ne peut pas encore confirmer de paiement avant la configuration du secret de signature côté Supabase.
- **Deux tables RLS** ajoutées : comptes chauffeurs Stripe test et sessions de paiements sandbox. Modification de paiement interdite côté utilisateur.
- **Interface Stripe test** accessible dans l'espace client et dans l'onglet Gains du chauffeur.
- Les paramètres Stripe TEST sont présents dans Supabase ; un compte Express TEST est associé au chauffeur, mais non encore validé pour les encaissements et virements. Voir `PARAMETRAGE-STRIPE-TEST.md`.
- **Aucune transaction Stripe de test confirmée de bout en bout**, aucun paiement réel, aucune clé live enregistrée.
- Le modèle 100 % chauffeur / 0 % SAMGO est conservé. En destination charge, **les frais Stripe sont supportés par SAMGO**, un coût à anticiper avant tout lancement.

## Statut exact
- [x] Interface de simulation dans « Réserver » et « Chauffeur > Gains ».
- [x] Phase de lancement : 100 % du tarif théorique chauffeur / 0 % de commission SAMGO, avec contrôle des montants en centimes. Le 90 % / 10 % reste une évolution future, pas automatique.
- [x] Calcul protégé contre les montants négatifs ou déraisonnables, testé sans requêtes au réseau.
- [x] Compte Stripe **environnement de test SAMGO** connecté à ChatGPT. **Les trois paramètres secrets TEST apparaissent maintenant dans Supabase ; valeurs non consultables depuis ChatGPT**.
- [ ] Intégration du système d'inscription/validation des comptes Stripe Connect chauffeur.
- [ ] Création de sessions Stripe Checkout en environnement sandbox (serveur uniquement).
- [x] Code de webhook de paiement Stripe **sandbox** déployé et endpoint test créé chez Stripe ; clé de signature toujours à ajouter côté Supabase pour permettre sa vérification effective.
- [ ] Vérification des tarifs, statuts de mission et destinataires côté serveur.
- [ ] Remboursements, annulations, incidents, justificatifs, journal comptable et rapprochement bancaire.
- [ ] Contrats, assurances, fiscalité et conformité avant le mode réel.

## Principes du modèle envisagé

Pour un prix fictif de 20,00 € :
- Montant présenté au client : 20,00 €
- Montant théorique chauffeur au lancement : 20,00 €
- Commission théorique SAMGO au lancement : 0,00 €
- Frais de paiement, frais éventuels de Connect, TVA, charges et remboursements **non déduits**.

**Politique retenue :** au lancement, SAMGO applique 0 % de commission sur le tarif de course. Le passage éventuel à 10 % plus tard exige une **décision explicite du propriétaire**, une information claire des chauffeurs et la mise à jour des contrats, tarifs et systèmes serveur. Il n'est pas déclenché automatiquement par un seuil de succès.

**Important :** 100 % du tarif pour le chauffeur ne signifie pas nécessairement 100 % net sur son compte bancaire : des frais de traitement Stripe, de virement, des taxes et autres frais peuvent rester dus. Définir contractuellement qui supporte les coûts, et ne pas promettre un virement intégral sans l'avoir vérifié. Les barèmes Stripe dépendent du mode de paiement et de l'intégration Connect. https://stripe.com/fr/connect/pricing

## Architecture prévue, sans secret dans le navigateur

1. Le client crée une **demande validée** ; un serveur authentifié récupère l'annonce et calcule/fige le prix depuis une donnée de confiance. Le navigateur **ne doit jamais décider du prix final**.
2. Chaque chauffeur indépendant, dont l'identité et la capacité d'exercer ont été vérifiées pour la prestation, utilise une procédure d'inscription **hébergée par Stripe Connect** pour les informations financières. On ne collecte pas de RIB sur GitHub Pages.
3. Le serveur contrôle que le chauffeur assigné correspond au compte Stripe Connect configuré côté serveur. L'identifiant du destinataire de fonds ne doit jamais être librement fourni par le client.
4. L'application crée une session de paiement **test uniquement** côté serveur (ex. Supabase Edge Function, secrets stockés via Supabase). Les pages de règlement sont hébergées par Stripe. Aucun moyen de paiement n'est stocké côté SAMGO.
5. Les statuts « payé / échec / remboursé » sont mis à jour **exclusivement** sur preuve d'un événement Stripe dont la signature webhook est vérifiée, ou d'une requête serveur authentifiée à l'API Stripe. Ne jamais se fier uniquement à une URL de retour client.
6. Prévoir idempotence (aucun double prélèvement), audit, litiges, remboursements, répartition/frais, bonnes pratiques RGPD, assistance et contraintes sectorielles avant activation.
7. Ne pas déployer de fonction capable de générer des paiements avec une clé **live** avant vérifications juridiques et tests approfondis. Bloquer techniquement le mode réel jusqu'à autorisation explicite.

## Actions demandées au propriétaire — plus tard

1. Créer un compte sur https://dashboard.stripe.com/register, si aucun n'existe.
2. Basculer dans une **sandbox** / mode test Stripe ; consulter les modalités tarifaires sur https://stripe.com/fr/connect/pricing.
3. Connecter Stripe à ChatGPT si souhaité, ou configurer le compte soi-même dans le Dashboard.
4. Lorsque le compte Stripe existe, activer une solution serveur sécurisée pour la gestion des comptes Connect et les paiements de démonstration. **Ne jamais coller de clé secrète dans un chat ou dans le code public du site**.

## Mise en garde

Les écrans de démonstration appellent désormais la fonction serveur Supabase Stripe SANDBOX. Aucun paiement n'a encore été confirmé ; aucune clé live ni aucun virement réel n'a été activé. Le projet reste une **démonstration** : aucune course réelle ne peut être proposée avant les assurances, les vérifications des chauffeurs, les conditions contractuelles et les obligations légales.

Références :
- https://docs.stripe.com/connect/accounts-v2
- https://docs.stripe.com/connect/testing
- https://docs.stripe.com/connect/destination-charges
- https://supabase.com/docs/guides/functions
