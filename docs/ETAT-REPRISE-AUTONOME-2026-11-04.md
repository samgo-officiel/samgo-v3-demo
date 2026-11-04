# SAMGO — Reprise autonome du 4 novembre 2026

**Projet :** dépôt existant `samgo-officiel/samgo-v3-demo` et backend Supabase `SAMGO-V3`.  
**Statut :** prototype uniquement. Aucun trajet réel, aucun encaissement LIVE, aucune publication de nouvelle version.

## Travail réalisé sur la branche de brouillon

- Navigation native Android : le bouton Retour donne la priorité au QR Stripe TEST, puis à la messagerie plein écran, puis au menu. Il ne change plus de route derrière une fenêtre encore ouverte.
- QR Stripe TEST : état d'ouverture explicite pour le gérer correctement, fermeture sans paiement ni transfert.
- Messagerie : les brouillons sont conservés **en mémoire** entre deux ouvertures sous un même compte. Ils sont effacés à la déconnexion ou en changeant de compte.
- Service worker : pas de gestionnaire de notifications push tant qu'aucune gestion sécurisée des abonnements et du consentement n'est en place.
- Tests automatisés spécifiques à ces comportements : Android, QR, brouillons, absence de push.

PR en brouillon : https://github.com/samgo-officiel/samgo-v3-demo/pull/34

## Observations vérifiées du backend (lecture seule)

- Projet Supabase SAMGO-V3 : actif.
- Les tables publiques consultées ont toutes RLS activée. Trois anciennes tables ont volontairement RLS sans politique (accès bloqué), ne pas les ouvrir sans audit.
- L'analyseur de sécurité signale que la protection contre les mots de passe divulgués est désactivée. À configurer dans Supabase Auth si l'offre le permet.
- Fonctions Stripe `samgo-stripe-sandbox` (JWT requis) et `samgo-stripe-webhook` (webhook à signature Stripe) présentes et actives. Les codes contrôlés sont conçus pour refuser le mode LIVE. **Ce contrôle du code ne confirme aucun paiement de bout en bout.**
- L'analyseur de performance indique des clés étrangères sans index et des politiques RLS permissives multiples. Ce sont des optimisations ultérieures, pas une justification pour supprimer des règles de sécurité.
- Aucune modification SQL ni aucun changement de configuration d'authentification ou de Stripe n'a été effectué.

## Étapes encore à faire

| Domaine | Code ou préparation existants | Validation manquante |
|---|---|---|
| E-mail | Auth et récupération | SMTP vérifié, inscription et lien de récupération reçus |
| Profils chauffeurs | Formulaires, approbation TEST | Dossiers réels, permis, sécurité et assurances vérifiés |
| Carte / GPS | Carte et radar approximatif TEST | GPS réel consenti, itinéraires, réseau lent, zones chaudes |
| Mise en relation | Annonce/réponse/choix TEST | Parcours complet sur deux comptes réels |
| Chat | Textes TEST et tests automatisés | Échange réel à deux téléphones ; vocaux audio non finalisés |
| Paiement | Fonctions Stripe sandbox, QR TEST | KYC chauffeur Stripe TEST, Checkout, webhook signé |
| Notifications et factures | Tables et parcours TEST | Fonctionnement réel, fiabilité et validations |
| iOS / Android | PWA et squelette Capacitor | Builds signés, essais physiques, distribution |
| Juridique | Documents préparatoires | Avocat, assurances couvrant la conduite du véhicule client, contrats |

## Règles de lancement

1. Ne jamais déduire qu'un test simulé constitue un test réel Supabase/Stripe.
2. Ne pas activer la commission ni les paiements LIVE automatiquement.
3. Ne pas traiter des documents de chauffeurs, pièces d'identité ou coordonnées bancaires dans des fichiers GitHub publics.
4. Ne pas ouvrir de réservation ou conduite réelle avant validation juridique et assurances.
5. Fusion du brouillon dans `main`, publication en stores et achats externes seulement après décision explicite du propriétaire.

## Mesure d'avancement

Aucun **90 %** ne peut être déclaré sur la base du seul code. Pour une mesure fiable, faire une recette par fonctionnalité avec preuve de tests sur vrai réseau, deux comptes distincts, puis prendre en compte le juridique avant un lancement réel.
