# SAMGO V3 — Suivi technique (prototype)

Mise à jour : 27 octobre 2026. Ce dépôt est une **démo**, pas un service de transport lancé.

## Parcours de démonstration développé

1. Créer un compte client de test et un compte chauffeur de test approuvé.
2. Depuis « Réserver », saisir **deux lieux fictifs** et sélectionner une distance fictive.
3. Le client peut publier volontairement une annonce de test avec une position GPS **arrondie à deux décimales**. Durée d'affichage maximale : 2 heures (l'enregistrement n'est pas encore automatiquement supprimé de la base après expiration).
4. Depuis son espace, le chauffeur approuvé autorise son GPS et choisit un rayon de 5 à 50 km. Son emplacement n'est pas enregistré en base ; la recherche se fait dans son navigateur.
5. Le chauffeur envoie « Je suis intéressé (test) » et le client consulte ses réponses de test.
6. Le client choisit une seule réponse de chauffeur pour une simulation. Les champs de propriétaire ne peuvent pas être modifiés après la création.
7. Dans le panneau Chauffeur, étapes de suivi **fictives** : en route, arrivé, trajet commencé. Dans Mes courses, le client consulte ces changements.
8. Le client peut annuler la simulation (avant clôture) ou la marquer comme terminée. Uniquement après la clôture, il peut publier un avis de test de **1 à 5 étoiles**, avec commentaire de 300 caractères max.
9. Les notes de démonstration sont visibles seulement par les deux participants. Aucun avis n'est public ou présenté comme évaluations vérifiées.

## Sécurité vérifiée dans Supabase

- RLS activée sur les tables `annonces_raccompagnement_test`, `reponses_annonces_test`, `choix_chauffeur_test`, `suivi_course_test` et `avis_chauffeurs_test`.
- Accès des comptes anonymes refusé sur ces tables, droits SQL minimisés.
- Un seul choix par annonce, une seule réponse par chauffeur et par annonce, un seul avis par simulation terminée.
- Les transitions de suivi ne peuvent pas revenir en arrière. Le chauffeur ne peut pas modifier les identifiants associés au trajet.
- La suppression d'une annonce ayant un chauffeur sélectionné est bloquée pour préserver l'historique de simulation et l'avis.
- Aucun document sensible, aucune adresse précise de départ / arrivée, aucune position GPS exacte du chauffeur ne doivent être stockés via ces écrans.

## Vérifications effectuées

- Vérification de syntaxe des scripts frontend et des identifiants HTML uniques.
- Tests des modules frontend **avec comptes et réponses serveur simulés**, incluant sélection, suivi, annulation, fin et note de 1 à 5 étoiles.
- Inspection des politiques RLS, des droits SQL et du rapport de sécurité Supabase.

**Non validé :** parcours de bout en bout avec deux véritables sessions Supabase sur deux téléphones différents. Une simulation en mémoire ne vaut pas une validation réelle du réseau, du GPS ou des politiques RLS lors d'une connexion utilisateur.

## Reste à développer avant toute ouverture réelle

- Tests multi-appareils, gestion des erreurs réseau et de la reconnexion, pagination des annonces ; éviter de télécharger les annonces de toute la France avant filtrage.
- Geocodage réel des adresses, calcul d'itinéraires sur carte et ETA ; respect du consentement et de la minimisation de la localisation.
- Notifications push hors application : service d'envoi, abonnements, autorisations et tests iOS/Android. Le service worker actuel **ne déclenche pas** de push tout seul.
- Modération et signalements des avis, gestion des abus, confidentialité, suppression et expiration effective des données.
- Administration opérationnelle, vérification d'identité/permis/statut, contrats et assurance adaptés, traitement des incidents.
- Paiements et commission SAMGO après validation légale ; aucun paiement actif dans la démo.
- Tests d'accessibilité et de fiabilité sur iPhone et Android, puis publication éventuelle.

## Notes importantes

La validation « chauffeur approuvé » actuelle est uniquement une validation de dossier **de test**, et ne garantit ni identité, ni permis, ni assurance. Le prototype ne doit attribuer ni conduire aucune course réelle.

## Améliorations ajoutées le 27 octobre 2026 — synchronisation et lisibilité

- Les panneaux « Mes courses » et « Demandes / profil chauffeur » rechargent automatiquement leurs informations **environ toutes les 45 secondes**, uniquement tant que SAMGO est ouvert, visible et que l'utilisateur est connecté.
- Le GPS n'est **jamais demandé** par cette actualisation. La page signale une connexion hors ligne et l'heure du dernier rafraîchissement tenté. Les annonces géolocalisées conservent leur propre actualisation de test.
- Le parcours d'une course fictive affiche une **frise à 5 étapes** côté client et chauffeur : choisi, en route, arrivé, trajet commencé, terminé. L'annulation est indiquée sans être confondue avec une mission réelle.
- Le formulaire d'avis conserve temporairement les étoiles et le commentaire **en mémoire** lors d'une actualisation ; le brouillon est supprimé après publication ou déconnexion. L'actualisation automatique évite de remplacer le formulaire quand l'utilisateur y écrit.
- Tests de simulation JavaScript réussis sur l'enchaînement des étapes, l'affichage du progrès, la note après la fin et la conservation du brouillon. Il reste **à tester en conditions réelles** le parcours entre plusieurs appareils avec de véritables sessions utilisateur.

## Préparation Stripe Connect — 28 octobre 2026

- Ajout d'un simulateur visuel dans « Réserver », configuré au lancement pour 100 % chauffeur / 0 % SAMGO. Le futur 90 % / 10 % n'est qu'une évolution possible, **jamais automatique** et nécessitant communication aux chauffeurs.
- Ajout d'un encart d'information non connecté sur l'onglet « Chauffeur > Gains ».
- Le calcul est uniquement local : aucun paiement, aucune demande de carte ou d'IBAN, aucune clé API Stripe dans le navigateur.
- Tests JavaScript : arrondis en centimes, montants invalides, total 100 % et changement de distance. **Aucune transaction Stripe effectuée.**
- Consulter \`PAIEMENTS-STRIPE-CONNECT.md\` pour les prérequis serveur, la sécurité et l'état des étapes.
- Prérequis à toute intégration de paiement Stripe sandbox : un compte Stripe propriétaire connecté, validation des types de comptes Connect, une partie serveur avec secret de test, et des tests complets.

## Répartition au lancement — décision du 28 octobre 2026

- Commission SAMGO : **0 % au lancement** ; part du chauffeur : **100 % du tarif hors frais de paiement et taxes**, uniquement à titre de simulation pour le moment.
- Un éventuel **10 % SAMGO / 90 % chauffeur** sera décidé plus tard, après communication des tarifs et conditions aux chauffeurs, sans activation automatique.
- L'unique paramètre visible de démonstration est `SG_DEMO_COMMISSION_PERCENT` dans `index.html`. Ce paramètre navigateur n'a **aucune autorité** pour de véritables paiements, qui devront être calculés et validés côté serveur.
- La répartition se retrouve dans la réservation, les missions simulées, l'onglet Gains et le simulateur Stripe Connect. Les frais Stripe ne sont pas automatiquement pris en charge par SAMGO : leurs modalités restent à définir.


## Avancement Stripe Connect SANDBOX — 28 octobre 2026

- **Compte Stripe de test SAMGO connecté à ChatGPT** (un compte Stripe Express de test désormais associé au chauffeur SAMGO approuvé, inscription encore incomplète).
- **Deux fonctions Supabase déployées** : `samgo-stripe-sandbox` (onboarding chauffeur et Checkout test, JWT obligatoire) et `samgo-stripe-webhook` (signature Stripe vérifiée).
- **Webhook créé chez Stripe en sandbox** pour les événements Checkout. Il ne peut pas encore confirmer de paiement avant la configuration du secret de signature côté Supabase.
- **Deux tables RLS** ajoutées : comptes chauffeurs Stripe test et sessions de paiements sandbox. Modification de paiement interdite côté utilisateur.
- **Interface Stripe test** accessible dans l'espace client et dans l'onglet Gains du chauffeur.
- Les trois noms de secrets Stripe TEST apparaissent dans Supabase, mais leurs valeurs ne sont pas inspectables. Un compte Stripe Express de test est associé au chauffeur approuvé ; son onboarding reste incomplet. Voir `PARAMETRAGE-STRIPE-TEST.md`.
- **Aucune transaction Stripe de test confirmée de bout en bout**, aucun paiement réel, aucune clé live enregistrée.
- Le modèle 100 % chauffeur / 0 % SAMGO est conservé. En destination charge, **les frais Stripe sont supportés par SAMGO**, un coût à anticiper avant tout lancement.

## Stripe Connect — diagnostic et correction du 28 octobre 2026

- Après une erreur HTTP 400 pendant « Configurer mon compte chauffeur Stripe TEST », les journaux Supabase montrent que l'authentification et la lecture du dossier chauffeur réussissent.
- Deux comptes connectés TEST sont visibles dans le Dashboard Stripe, dont un de type contrôlé avec tableau de bord Express. Les comptes n'étaient pas associés aux utilisateurs SAMGO.
- Vérification du statut approuvé du compte chauffeur, puis association administrative de l'unique compte Express de test disponible avec ce chauffeur dans `samgo_stripe_chauffeurs_test`. Un contrôle SQL a confirmé **une seule association**. Aucun compte supplémentaire, paiement ou virement n'a été créé.
- La fonction `samgo-stripe-sandbox` a été mise à jour pour conserver, masquer les données sensibles et afficher le **code d'erreur Stripe détaillé** plutôt qu'un simple « 400 ». La version publiée est **7**, contrôle JWT maintenu. Les tentatives enregistrées peuvent être diagnostiquées sans exposer de clés.
- L'interface chauffeur affiche dorénavant « compte TEST lié, vérification en attente » lorsque le statut serveur confirme l'association.
- Le compte connecté est de type Express, avec `charges_enabled=false`, `payouts_enabled=false`, `details_submitted=false`. Le prochain test consiste à ouvrir la procédure d'onboarding hébergée par Stripe **depuis le bouton SAMGO**, et à suivre les seules étapes TEST.
- **Non encore vérifié :** création effective du lien d'onboarding via la clé de test Supabase, finalisation de l'onboarding, Checkout de test complet, puis réception d'un webhook Stripe signé.
