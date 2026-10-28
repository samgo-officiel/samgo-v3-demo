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

## Nouvelles vérifications de régression

- [ ] Après avoir ouvert Mes courses, contrôler que la carte fidélité indique « TEST », progresse après une course fictive terminée, et ne promet aucun cadeau réel.
- [ ] Tester la déconnexion alors qu'Internet est coupé : le compte et les données privées disparaissent immédiatement.
- [ ] Si le réseau tombe sur une session existante, vérifier l'alerte et l'impossibilité de lancer les opérations chauffeur sans vérification serveur.
- [ ] Tester le rafraîchissement du suivi client après une étape du chauffeur sur un second appareil (maximum 45 secondes, application visible).
- [ ] Installer l'application web sur écran d'accueil iOS/Android et contrôler la nouvelle icône PNG.
- [ ] Avec Node.js 22 ou version compatible sur un clone de ce dépôt, exécuter `node --test tests/auth-session.test.cjs`. La présence du script ne vaut pas exécution.


## GPS — vérifications téléphone (préparées pour ce soir)

Les fonctions de localisation ci-dessous utilisent le GPS seulement après appui volontaire et sur la **démonstration**, jamais pour une mission réelle.

1. Sur le compte chauffeur de test approuvé : **Chauffeur → Missions → Activer / actualiser mon GPS**. Accorder la position au navigateur et vérifier le message « GPS actif » et la précision annoncée (si elle est fournie).
2. Passer le rayon **5 → 10 → 30 → 50 km**. Le libellé et la recherche doivent suivre le changement sans redemander l'autorisation GPS.
3. Appuyer sur **Arrêter la recherche GPS**. Vérifier que les demandes et alertes de proximité sont effacées de cette vue et que les vérifications automatiques s'arrêtent. L'autorisation déjà accordée dans les paramètres du téléphone n'est pas révoquée par ce bouton.
4. Réessayer avec le **GPS refusé** : le site doit expliquer comment autoriser la localisation via les paramètres du navigateur/téléphone, sans planter.
5. Réessayer avec **Internet désactivé** : la recherche doit montrer un message d'erreur et ne pas annoncer de nouvelles demandes comme si elles avaient été chargées.
6. Tester **déconnexion puis changement de compte** et éventuellement désactivation juste après le clic GPS : une ancienne réponse GPS ou serveur ne doit jamais réafficher les données de l'ancien compte.
7. Après plus de **15 minutes** sans nouvelle demande GPS volontaire, la recherche arrête l'utilisation de la position précédente et demande d'actualiser volontairement.
8. Depuis le compte client de test, publier une annonce avec **noms de lieux fictifs** seulement et confirmer que le chauffeur proche ne voit qu'une position approximative, jamais l'adresse exacte.

**Limite actuelle :** recherche géographique et distance à vol d'oiseau sur des annonces fictives ; **pas encore de carte routière, géocodage d'adresse, itinéraire voiture, temps d'arrivée (ETA) ni distance routière**. Aucun fournisseur cartographique tiers ou abonnement payant n'a été ajouté.

**Régression JavaScript simulée (contrôle de code du 28 octobre 2026)** : 4 scénarios réussis — résultat de GPS après arrêt ignoré, précision de mesure affichée, rayon changé déclenche une nouvelle requête, changement de compte pendant la permission GPS ignoré. Ces tests ne remplacent pas un navigateur et un vrai téléphone.


## Site + PWA — essais restants au propriétaire (28 octobre)

- [ ] Sur Chrome Android et Safari iPhone, ouvrir **Chauffeur → Missions**, autoriser la localisation et vérifier le **schéma de proximité** : « VOUS » au centre, N en haut, nombres sur la carte correspondant aux annonces fictives.
- [ ] Vérifier que **Arrêter la recherche GPS** efface le schéma et les annonces, et que modifier le rayon 5/10/20/30/50 km met à jour la carte.
- [ ] Faire le test à deux comptes avec publication d'une annonce fictive depuis un autre appareil dans une zone proche : le chauffeur approuvé doit voir la même annonce sur la carte et dans la liste.
- [ ] Vérifier la version PWA installée depuis l'icône d'écran d'accueil, en rechargeant la page si besoin, et comparer à la version navigateur.
- [ ] Tester confirmation et récupération e-mail, y compris lien expiré, sur un compte de test contrôlé. **Ne transmettre aucun code OTP, mot de passe, jeton ou lien privé.**
- [ ] Vérifier les réglages Supabase Auth des redirections et demander l'activation de la protection contre les mots de passe divulgués si disponible.
- [ ] Vérifier une carte routière, ETA et tarification réelle **seulement après choix d'un fournisseur et validation de sa politique de confidentialité, de ses quotas et coûts**.

La carte actuelle est **schématique et locale**, non une carte OpenStreetMap/Google Maps, et n'a aucune fonction de navigation vers un client. GitHub Actions vérifie la syntaxe et les tests de régression ; ce n'est pas un test d'intégration mobile ni une preuve de lancement possible.


## Contrôle du téléphone — diagnostic sans autorisation GPS

- [ ] Depuis le **site ou la PWA**, ouvrir **Compte**, dérouler « Diagnostic de mon téléphone (TEST) » puis toucher « Vérifier mon téléphone ».
- [ ] Vérifier les mentions HTTPS, installation ou navigateur, disponibilité du GPS et état de l'autorisation. **Ce bouton ne doit pas déclencher de demande de position**.
- [ ] Le diagnostic doit afficher un état compréhensible en cas de GPS refusé, d'absence de permissions API ou de mode hors connexion.
- [ ] Depuis **Chauffeur → Missions**, appuyer séparément sur « Activer / actualiser mon GPS » pour faire le vrai test d'autorisation sur un appareil ; n'utiliser que les annonces fictives.
- [ ] Depuis le profil chauffeur, appuyer sur « Actualiser mes avis » et vérifier que le chargement des avis de **test** se lance, même si aucun avis n'existe.

La réussite du diagnostic est indicative : elle ne remplace pas les tests sur téléphone, les assurances ni les contrôles d'identité avant un lancement réel.


## Contrôles additionnels préparés

- [ ] Envoyer un message fictif, changer de compte ou se déconnecter très rapidement : aucun contenu de l'ancien compte ne doit réapparaître ni effacer un brouillon du nouveau.
- [ ] Arrêter la recherche GPS chauffeur depuis Missions : les annonces du client connecté doivent rester visibles dans Mes courses.
- [ ] Se déconnecter : les annonces privées de l'ancien compte, les conversations et le statut Stripe TEST doivent disparaître de l'écran.
- [ ] Après une éventuelle inscription Stripe **de test**, vérifier que le bouton et le statut ne restent pas associés à l'ancien compte en cas de déconnexion.
- [ ] Ouvrir `donnees-test.html` depuis Compte/Aide : comprendre les coordonnées approximatives, la conservation en base et la nature fictive des données. La politique de confidentialité définitive nécessite une révision juridique.
