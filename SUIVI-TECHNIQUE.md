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

- Ajout d'un simulateur visuel dans « Réserver », avec montants client / chauffeur 90 % / SAMGO 10 %.
- Ajout d'un encart d'information non connecté sur l'onglet « Chauffeur > Gains ».
- Le calcul est uniquement local : aucun paiement, aucune demande de carte ou d'IBAN, aucune clé API Stripe dans le navigateur.
- Tests JavaScript : arrondis en centimes, montants invalides, total 100 % et changement de distance. **Aucune transaction Stripe effectuée.**
- Consulter \`PAIEMENTS-STRIPE-CONNECT.md\` pour les prérequis serveur, la sécurité et l'état des étapes.
- Prérequis à toute intégration de paiement Stripe sandbox : un compte Stripe propriétaire connecté, validation des types de comptes Connect, une partie serveur avec secret de test, et des tests complets.
