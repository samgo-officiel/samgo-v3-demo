# SAMGO — recette de la démonstration sur deux appareils

Date de préparation : 28 octobre 2026. Aucun paiement et aucune vraie course pendant ces essais.

## Prérequis

- Un téléphone connecté au compte **client de test** et un second au compte **chauffeur approuvé de test**.
- Autoriser les demandes de GPS *uniquement* quand le bouton le demande. Préparer deux noms de lieux **fictifs** (pas d'adresse précise).
- Les deux appareils sont physiquement proches pour apparaître dans le rayon de 5 à 50 km. Ils peuvent aussi tester GPS refusé et localisation lointaine.
- Ne pas utiliser de vrais documents, de numéro, de RIB ou de paiement sur ces parcours fictifs.

## Parcours principal

1. Sur le compte client : ouvrir SAMGO, faire une simulation de 5 à 20 km, accepter l'information sur la position approchée, **publier une annonce TEST**.
2. Sur le compte chauffeur approuvé : ouvrir le tableau de bord chauffeur, onglet Demandes, appuyer sur « Activer / actualiser mon GPS » et choisir un rayon adapté.
3. Vérifier que la demande fictive apparaît, avec sa distance approximative, sans l'adresse GPS exacte du client.
4. Cliquer « Je suis intéressé (test) » depuis le compte chauffeur.
5. Sur le compte client : « Mes courses » → « Voir les avis et les réponses » → sélectionner le chauffeur fictif.
6. Ouvrir « Messagerie client–chauffeur (TEST) » sur chaque appareil, vérifier le même échange. Le clavier et les caractères accentués doivent fonctionner.
7. Sur le chauffeur : passer les statuts fictifs « en route », « arrivé », « trajet commencé » ; côté client actualiser, vérifier la frise.
8. Côté client : terminer la simulation, laisser 1 à 5 étoiles et un commentaire de test.
9. Vérifier que les avis restent privés aux participants, que le chat est consultable mais **ne peut plus envoyer** de message après clôture.
10. Tester « Voir mon statut Stripe TEST » : compte lié mais **vérification fictive refusée**, ne pas essayer de carte bancaire réelle.

## Cas négatifs obligatoires

- [ ] Un compte tiers ne voit ni les conversations ni leurs messages (contrôle RLS SQL passé, **test sur appareil encore à faire**).
- [ ] Après déconnexion, aucun ancien message ni brouillon du compte précédent ne reste accessible.
- [ ] Deux chauffeurs ne peuvent pas être choisis pour la même annonce.
- [ ] Après expiration (2 h), l'annonce n'apparaît plus dans la recherche.
- [ ] En cas de refus GPS, aucun écran ne plante et la demande de permission n'est pas répétée en arrière-plan.
- [ ] Un message vide ou de plus de 500 caractères est refusé.
- [ ] Un compte chauffeur non approuvé ne peut pas envoyer « intéressé ».
- [ ] Un utilisateur sans connexion Internet reçoit un message d'erreur clair, sans fausse confirmation.
- [ ] Un rafraîchissement pendant l'écriture d'un message ne supprime pas le brouillon.
- [ ] Aucun paiement, débit ou virement réel ne peut être déclenché.

## État des vérifications automatiques

- [x] Contrôle syntaxique des scripts HTML/JS lors de leur modification.
- [x] Politique RLS messages : client voit et envoie pendant `choisi_test`, chauffeur voit et envoie, tiers ne peut ni lire ni envoyer.
- [x] Test des règles RLS effectué dans une transaction SQL **ROLLBACK** (aucune annonce, choix ou message conservé).
- [x] `anon` sans accès SELECT ; `authenticated` sans accès UPDATE/DELETE aux messages.
- [x] Recherche de demandes filtrée en base sur la zone approximative et rayon de 5–50 km, puis distance Haversine dans le navigateur.
- [ ] Essai de bout en bout avec deux sessions réelles et le navigateur Safari/Chrome.

## Pour remonter un bug

Noter la page (client/chauffeur), l'action, la date et l'erreur visible ; joindre une capture **sans clé, OTP, adresse exacte, pièce d'identité ou numéro de téléphone**.

## Consigne de lancement

Cette recette ne certifie **ni l'assurance, ni la vérification réelle des permis et identités, ni le paiement live**. Aucune vraie prestation autorisée sur la base de tests fictifs.

## Vérification du nouveau parcours Compte (à faire avec le propriétaire ce soir)

- [ ] Ouvrir la page SAMGO depuis l'icône/application et vérifier la présence de « Mot de passe oublié ? » dans Compte.
- [ ] À partir de « Déjà inscrit », demander un e-mail de récupération à l'adresse d'un **compte de test contrôlé**. Vérifier le dossier spams et l'absence d'erreur de limitation d'e-mails.
- [ ] Ouvrir le lien depuis ce téléphone, vérifier que SAMGO propose « Choisir un nouveau mot de passe », puis définir un mot de passe neuf et reconnecter le compte.
- [ ] Vérifier que le lien de confirmation d'inscription aboutit bien à la page SAMGO (l'URL doit être présente dans les redirections autorisées du projet Supabase).
- [ ] Ouvrir « Aide et signalement » depuis Compte, sans envoyer de données confidentielles.
- [ ] Tester le GPS sur Chrome Android (autorisé puis refusé) et Safari iPhone, si disponible.
- [ ] Puis suivre le parcours client/chauffeur ci-dessus sur deux comptes et deux appareils, **uniquement avec des données et trajets fictifs**.
