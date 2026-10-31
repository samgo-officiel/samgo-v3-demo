# SAMGO — Plan opérationnel 8 étapes (31 octobre 2026)

**Statut : prototype TEST. Ne pas autoriser de véritables trajets, paiements LIVE ni publication stores sur la base de ce document.**

Audit de lecture réalisé sur GitHub et sur le projet Supabase SAMGO-V3. Ce document sépare ce qui est constaté, ce qui est à tester et ce qui nécessite le propriétaire.

## 1 — Inscriptions et récupération de compte
- Code : parcours Auth et récupération de mot de passe présents dans index.html ; retours spécifiques quota e-mail 429.
- Bloqué : SMTP externe à configurer dans Supabase Auth avec domaine expéditeur vérifié. Révoquer toute clé SMTP déjà communiquée, générer une nouvelle clé **dans le fournisseur**, la renseigner directement dans Supabase, sans la partager.
- Validation : nouvel utilisateur, confirmation mail, lien de récupération, lien expiré, retour depuis Gmail sur Android/iOS, limitation des tentatives.
- Sécurité : activer la protection des mots de passe compromis si le plan le permet (alerte Supabase du 31/10).

## 2 — GPS, annonces, affectation
- Présents en TEST : annonces, réponses, choix de chauffeur et positions approximatives.
- À faire : deux sessions distinctes sur deux téléphones, consentement GPS, rayon 30 km, déconnexion, refus d'autorisation, réseau faible.
- Corrigé côté serveur le 31/10 : contrainte PostgreSQL d'exclusion anti-doublons pour les créneaux TEST qui se chevauchent (validée); message utilisateur clair ajouté au frontend. Reste à réaliser un essai réel multi-comptes et à vérifier qu'un chauffeur ne répond pas à sa propre annonce.
- Ne jamais utiliser des lieux réels dans la recette.

## 3 — Messagerie
- Code et tests automatisés présents; test client/chauffeur réel manquant.
- Vérifier en deux sessions : ouverture immédiate après sélection, émission et réception, déconnexion/reconnexion, isolation d'un troisième compte, messages en 4G lente, clôture.
- Avant le live : définir la politique de conservation, notification/abus et protection des données.

## 4 — Paiement et QR code
- Stripe Connect / Checkout / QR **sandbox** présents; aucun paiement LIVE à activer.
- Bloqué : vérification officielle Connect TEST du compte chauffeur; réaliser un paiement fictif et contrôler le webhook signé, la session expirée, l'annulation et le montant de la commission (0 % au lancement seulement si explicitement décidé).
- Ne stocker aucune carte ni clé Stripe dans le dépôt.

## 5 — Notifications
- Table samgo_notifications_test présente, RLS activée.
- À faire : vérifier alertes visibles et robustesse réseau, puis concevoir abonnement push, permissions opt-in, expiration des jetons et livraison quand l'app est fermée.
- Pas de notifications de production avant tests des permissions, du backend et de l'opt-out.

## 6 — Sécurité / back-office
- Les 23 tables publiques recensées ont RLS activée; politiques sur les tables de simulation, paiements, messages, signalements, notifications et facturation.
- Tables courses_codes, evaluations et signalements : RLS active **sans aucune policy**. Les garder fermées, ne pas créer de règle permissive pour faire disparaître le diagnostic.
- Avis Supabase du 31/10 : protection mots de passe compromis désactivée. Source : https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Vérifications prioritaires : tests effectifs RLS avec deux vrais comptes, contrôle des fonctions privilégiées, séparation admin/utilisateur, suppression de documents sensibles des journaux, système de signalement.
- Source diagnostic RLS sans policy : https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## 7 — Juridique / assurance
- Bloqué hors code : avis juridique sur statut des chauffeurs, modèle de mise en relation, CGU et responsabilité; confirmation écrite de couverture d'assurance adaptée au **chauffeur indépendant conduisant la voiture du client**.
- Évaluer RGPD, politique de confidentialité, conservation, gestion incidents, modalités de remboursement et facturation/TVA.
- Une simple clause de non-responsabilité ne protège pas contre toutes les obligations légales.
- Aucun trajet réel avant validation.

## 8 — iOS / Android et publication
- PWA disponible, configuration Capacitor et builds de diagnostic décrits par l'audit V2.
- Bloqué : tests physiques, comptes développeurs, signature/certificats, fiches store, politique de confidentialité, revue et acceptation Apple/Google.
- Lancement conditionné au passage complet du test sur deux appareils, traitement des incidents, consentements et validations assurance/juridique.
- Ne publier, ne dépenser et ne lancer aucune campagne sans autorisation explicite.

## Vérification technique effectuée le 31/10
- Correction de rafraîchissement après changement de compte / réseau lent, avec nouveaux tests automatisés.
- Garde anti-doublons de créneaux TEST appliquée dans Supabase et vérifiée (contrainte validée).
- GitHub Actions : les tests automatiques de la branche de correction ont réussi avant publication de ce bilan.

## Prochain test utilisateur groupé (quand le propriétaire revient)
1. Configurer SMTP et révoquer l'ancienne clé.
2. Créer deux comptes TEST distincts, chauffeur approuvé, ne transmettre aucun identifiant.
3. Sur téléphone A, demande fictive; sur B, réponse fictive; sur A, sélection; échanger deux messages fictifs; clôturer; vérifier isolation.
4. Finaliser vérification Stripe TEST, test Checkout+QR+webhook.
5. Faire valider assurance et juridique, puis donner accord pour comptes de distribution si désiré.

## Critères de passage au lancement
Les tests automatisés verts ne remplacent pas l'essai sur serveur réel. Exiger preuve d'un parcours complet sur deux téléphones, sécurité RLS testée avec comptes distincts, couverture et contrats validés, tests de charge/réseau, diagnostics sans alertes critiques et validation explicite du propriétaire.
