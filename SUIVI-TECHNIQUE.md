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

## Contrôle Stripe Connect autonome — 28 octobre 2026 (complément)

- L'inscription hébergée Stripe du chauffeur fictif a été soumise : `details_submitted=true`. La liaison chauffeur SAMGO ↔ compte Stripe Express TEST est confirmée, **mais pas la validation du compte**.
- Stripe renvoie `verification_failed_keyed_identity` sur les informations fictives de la personne (nom, adresse et téléphone). `charges_enabled=false` et `payouts_enabled=false`. Ce n'est pas une panne de Supabase ni une panne de connexion Stripe. **Aucune pièce d'identité réelle ne doit être envoyée dans ce parcours fictif.**
- Mise à jour du backend `samgo-stripe-sandbox` **version 9**, JWT obligatoire : l'action `driver_status` renvoie un état sommaire `correction_required`, `processing`, `incomplete` ou `ready` sans exposer les informations personnelles. L'action `checkout` refuse toujours les chauffeurs non vérifiés.
- La création future de comptes TEST par le serveur utilise les **propriétés controller** Stripe v1 pour un dashboard Express et une collecte KYC chez Stripe, plutôt que `type=express`; aucun compte supplémentaire n'a été créé pour tester cette modification.
- Interface web : le statut chauffeur ne dit plus « vérification en attente » si Stripe a refusé l'identité fictive ; elle propose une reprise de l'inscription. La version du script a été changée pour limiter les effets du cache.
- Contrôle Supabase : projet `ACTIVE_HEALTHY`, fonctions `samgo-stripe-sandbox` et `samgo-stripe-webhook` actives, RLS actif sur les 2 tables Stripe TEST et politiques SELECT limitées au chauffeur ou aux participants. **1 compte de test lié, 0 paiement TEST**.
- Les comptes de test peuvent utiliser des valeurs réservées par Stripe (ex. `individual.phone=0000000000` comme jeton de test validant un téléphone, `address_full_match` pour la rue avec ville/code postal cohérents, `file_identity_document_success` pour la simulation documentaire via API). Les valeurs de test ne garantissent pas l'acceptation dans toutes les interfaces ni tous les pays ; suivre la documentation officielle : https://docs.stripe.com/connect/testing .
- **Non encore vérifié :** validation KYC fictive du compte actuel, ouverture effective d'un Checkout pour un chauffeur vérifié, événement webhook signé de paiement et parcours complet client/chauffeur sur deux appareils. Ne pas activer la production.
- Audit Supabase : protection des mots de passe divulgués désactivée (avertissement), et 3 anciennes tables sans politiques RLS ; aucun accès supplémentaire n'a été ouvert. À traiter avant lancement public réel.

## Travaux autonomes — 28 octobre 2026 : messagerie / GPS / sécurité / checklist

- **Messagerie de simulation ajoutée et liée au site** (client dans Mes courses, chauffeur dans Demandes), accessible seulement une fois le chauffeur choisi ; lecture de l'historique après annulation/clôture mais envoi uniquement si `choisi_test`. Messages jusqu'à 500 caractères ; 40 derniers messages visibles, rendu `textContent` (pas de HTML interprété), rafraîchissement dans le site ouvert, effacement de l'interface à la déconnexion. Ce n'est pas une messagerie de production et elle ne reçoit pas de notifications push en arrière-plan.
- **Table `messages_course_test` créée avec RLS et droits minimaux** : seuls les deux participants au choix chauffeur peuvent voir les messages ; seuls les participants peuvent écrire pendant une simulation en cours ; aucune modification ni suppression par le navigateur. Test positif client/chauffeur et négatif tiers effectué dans une transaction SQL intégralement annulée. État post-test : 0 annonce, 0 choix, 0 message.
- **Recherche géographique côté serveur** : les demandes sont préfiltrées par un rectangle autour d'un centre GPS chauffeur arrondi à 0,1 degré ; la distance précise reste calculée en local via Haversine, avec une marge qui tient compte des arrondis. Le serveur reçoit une **zone de recherche approximative** et jamais la position GPS chauffeur exacte. Le rayon 5–50 km relance désormais la requête serveur, et non un filtre sur une liste mondiale.
- Ajout d'index géographiques et des deux accès à la sélection chauffeur (client/chauffeur).
- Scripts et manifeste PWA analysés sans erreur de syntaxe ; noms et fonctions du chat liés à l'HTML, mise à jour du cache par numéro de version. Ne vaut **pas** essai navigateur réel ou essai iPhone/Android.
- Security Advisors Supabase : protection contre mots de passe compromis **désactivée** ; 3 anciennes tables avec RLS mais sans policies (accès fermés). Pas de modifications automatiques de configuration Auth.
- Stripe Connect : toujours un compte test associé, vérification d'identité fictive refusée, `charges_enabled=false` et `payouts_enabled=false`. Zéro paiement d'essai et aucun paiement réel.
- Plans écrits dans `PLAN-LANCEMENT-SAMGO.md` (8 chantiers, assurance, droit, CNIL, Urssaf 2027) et `RECETTE-SAMGO-2-TELEPHONES.md` (scénario de test). Ce sont des checklists, pas des validations des fonctions manquantes.
- **RESTE** : deux sessions réelles simultanées, envoi du chat sur deux appareils, géocodage/itinéraire, vrai push, vraie modération, vérifications des chauffeurs, contrat d'assurance spécialisé, avis juridique, tests de paiement complets, production et publication stores. Ne pas ouvrir de vraies courses.


## Corrections autonomes du 28 octobre 2026 — comptes et assistance

- **Confirmation d'inscription par e-mail** : le client REST léger transmet désormais son URL de retour dans `redirect_to`, et récupère le jeton de session de la réponse implicite Supabase. Le fragment d'URL contenant le jeton est retiré de la barre d'adresse après lecture.
- **Conflit JS corrigé** : `URL`, qui masquait le constructeur `URL` natif, a été renommée `SUPABASE_URL` pour réparer la construction de l'adresse de confirmation.
- **Mot de passe oublié** : ajout de `assets/recuperation-compte-test.js`, avec demande de lien de récupération par e-mail, et formulaire pour changer le mot de passe après lien de récupération. Aucune clé secrète ou mot de passe n'est enregistré dans le dépôt ou dans le stockage du navigateur par ce parcours.
- **Résilience réseau** : une erreur de renouvellement de session causée par le réseau ne supprime plus immédiatement le jeton de session dans l'application ni dans la page Aide. Seuls les refus explicites (400/401/403) entraînent l'effacement de la session.
- **Support** : accès à `aide.html` depuis l'espace Compte ; aide mise à jour pour indiquer le nouveau parcours. Formulation de refus GPS adaptée aux différents navigateurs, pas seulement Safari.
- **Contrôle statique** : JavaScript compilé sans erreur de syntaxe dans les quatre blocs de `index.html`, le nouveau module de récupération, la page Aide et le module GPS ; identifiants HTML uniques contrôlés sur la page.
- **Audit Supabase** : toutes les tables du schéma public ont RLS activé. Les trois tables historiques sans policies restent fermées ; avertissement sur la protection contre mots de passe compromis toujours présent. Les tables `positions_chauffeurs_test`, `annonces_raccompagnement_test`, `messages_course_test` et `offres_chauffeurs` ont chacune **0 ligne au moment du contrôle**.
- **Non encore testé** : réception d'un vrai e-mail de confirmation ou de récupération, redirection vers la bonne URL et autorisation `redirect_to` dans la configuration Auth, comportement réel sur iPhone/Android, compte valide sur deux téléphones. Aucun mot de passe de compte, paiement ou donnée personnelle n'a été modifié automatiquement.


## Développement autonome complémentaire — 28 octobre 2026

Les changements ci-dessous sont des améliorations de **démonstration**. Ce ne sont pas des validations du service en production :

- **Sécurité et résilience des sessions** : un seul renouvellement de jeton si plusieurs écrans appellent Supabase en même temps ; une panne réseau ne vide plus automatiquement la session. Un rejet Auth explicite (400, 401, 403) provoque la déconnexion locale. Une réponse de renouvellement tardive ne peut plus recréer une session que l'utilisateur a déconnectée.
- **Déconnexion immédiate** : effacement des jetons locaux avant la fin éventuelle de l'appel serveur (même hors Internet). Les panneaux privés de messagerie, recherche, notation, fidélité et simulation locale sont effacés lors d'une perte de session ou d'un changement de compte confirmé.
- **État utilisateur hors connexion** : le nom du compte déjà connu peut rester visible si le réseau est inaccessible, mais les opérations liées à l'approbation chauffeur sont bloquées tant que celle-ci ne peut pas être revérifiée.
- **Rafraîchissement des courses fictives** : les statuts et avis côté client sont désormais rechargés avec les annonces et les messages lors du cycle de synchronisation. Une erreur d'un module ne doit plus se traduire par un « synchronisé » trompeur.
- **Carte fidélité fictive** : l'espace Mes courses possède un compteur des choix `termine_test` appartenant au client, avec objectif illustratif 10. Aucun coupon, récompense réelle, virement ni avantage financier ; l'historique REST est limité aux 100 choix récents.
- **Installation PWA** : icône PNG 192 × 192 issue du logo SVG, ajoutée au manifeste et déclarée en `apple-touch-icon`. L'installation sur un iPhone/Android physique n'a pas encore été validée ; PNG 512 × 512 et tests App Store/Play Store encore à prévoir.
- **Tests de régression** : ajout de `tests/auth-session.test.cjs` (7 cas Node.js natif : concurrence, réseau hors ligne, session invalide, déconnexion immédiate, lien d'inscription, recovery, réponse tardive). Les scénarios correspondants ont été simulés en JavaScript pendant la modification, mais le fichier de tests Node doit encore être exécuté depuis un clone complet dans un environnement CI/local.
- **Contrôle technique** : les blocs JS `index.html`, les nouveaux modules et le manifeste ont été analysés sans erreur de syntaxe ; aucun doublon d'identifiant HTML lors de l'intégration de la fidélité.
- **Contrôles non faits** : expérience réelle navigateur, deux appareils, e-mails Auth, notification quand fermé, couverture assureur, conformité juridique, Stripe Checkout et webhook de bout en bout. Ne pas proposer de vraie course.

**Attention :** le dépôt GitHub `samgo-officiel/samgo-v3-demo` est PUBLIC. Il ne doit pas contenir de données d'identité, secrets Stripe/Supabase, mots de passe ou instructions internes sensibles. Une éventuelle privatisation du dépôt doit être décidée avec un plan de déploiement compatible GitHub Pages.


## Sécurisation GPS autonome — 28 octobre 2026

- Le module `assets/demandes-geoloc-test.js` valide désormais les coordonnées renvoyées par le navigateur, indique une précision GPS estimée si disponible et refuse une réponse provenant d'une ancienne demande après arrêt ou changement d'utilisateur.
- Les recherches d'annonces devenues obsolètes après un changement de rayon, une nouvelle mesure GPS ou une déconnexion sont ignorées. Une panne de la requête des réponses de chauffeurs n'est plus traitée comme s'il n'y avait aucune réponse.
- Le choix du rayon 5–50 km déclenche une nouvelle recherche et actualise immédiatement la distance affichée.
- Nouveau bouton **Arrêter la recherche GPS**. L'application efface les coordonnées exactes en mémoire de son module, arrête sa boucle de recherche et retire la liste visible. Il ne révoque pas les permissions du navigateur.
- Sans mesure récente, l'application arrête la recherche après **15 minutes** plutôt que d'employer indéfiniment une ancienne position.
- Pour la publication côté client, une permission GPS reçue après changement de compte est rejetée avant tout envoi.
- **4 essais fonctionnels simulés** via faux navigateur/GPS ont passé, plus contrôle syntaxique JS et intégration HTML. Les essais sur vrai Android/iPhone, réseau physique, carte routière et itinéraires restent à faire.


## Développements autonomes — site et application web — 28 octobre 2026 (fin de journée)

- **Carte schématique GPS de proximité** : nouveau module `assets/carte-proximite-test.js` intégré au tableau de bord chauffeur du site et de la PWA. Le chauffeur reste au centre, des repères numérotés matérialisent les demandes proches selon leur direction et une distance approximative à vol d'oiseau ; aucun appel à un fournisseur cartographique, aucun itinéraire routier ni transmission additionnelle de la position exacte. Jusqu'à 24 repères affichés ; les annonces conservent leur liste complète en dessous.
- **Tests du radar** : `tests/carte-proximite.test.cjs` (5 scénarios : directions, effacement, données invalides/hors rayon, absence d'affichage des coordonnées, rayon invalide).
- **Tests du module GPS** : `tests/gps-demandes.test.cjs` (7 scénarios : autorisation, arrêt pendant permission, précision, rayon, changement de compte, expiration 15 min, coordonnées invalides).
- **Automatisation des vérifications** : `.github/workflows/verifications-samgo.yml` lance les tests Node natifs du dépôt et contrôle syntaxe JavaScript, manifeste PWA et unicité des identifiants HTML à chaque mise à jour de `main`. Premier run observé **réussi** ; vérifier les nouveaux runs sur https://github.com/samgo-officiel/samgo-v3-demo/actions .
- **Sécurité connexion** : les fragments d'URL contenant un `access_token` ou `refresh_token` sont retirés immédiatement, y compris si le fragment est malformé, et un test de régression est ajouté à `tests/auth-session.test.cjs`. Ne jamais partager une URL contenant un jeton.
- **Audit read-only Supabase** : RLS activée sur les tables publiques déjà contrôlées. Alerte persistante **Leaked Password Protection Disabled** ; trois tables anciennes avec RLS sans policy (accès refusé par défaut) ; avertissements de performance (index de FK manquants et multiples policies permissives). Aucun changement de DB, de configuration Auth, ni de flux financier n'a été effectué ici.
- **Limites réelles** : accès au site public en navigateur non confirmé depuis cet environnement ; tests mobiles avec un véritable GPS, e-mails de confirmation/récupération, itinéraire routier/ETA, notification hors site, assurance, KYC et paiement live encore manquants. Ne pas présenter le schéma comme une véritable carte routière et ne pas lancer de courses.



## Diagnostic téléphone et contrôle des boutons — 28 octobre 2026

- Le bouton « Actualiser mes avis » du profil chauffeur n'appelle plus une méthode inexistante : il lance maintenant `sgReviews.refreshDriver()`.
- Dans Compte, un bloc « Diagnostic de mon téléphone (TEST) » contrôle sur demande : HTTPS/contexte sécurisé, état réseau approximatif, mode d'installation PWA, présence de l'API GPS, état de l'autorisation GPS en lecture seule, disponibilité des notifications et service worker. Il ne sollicite pas la position et n'envoie aucune donnée.
- `tests/diagnostic-appareil.test.cjs` apporte 5 cas de régression sans géolocalisation réelle.
- `tests/ui-action-contract.test.cjs` vérifie les appels de fonctions depuis les contrôles HTML (ainsi que le bouton des avis et le chargement des scripts GPS/diagnostic), évitant qu'une fonction absente laisse un bouton inactif.
- Les contrôles de GitHub Actions sur le commit `ecd9697a64ea22111954eb96573aaea277b04495` ont réussi. Il reste à vérifier le comportement sur appareils réels ; ne pas confondre réussite des tests simulés et validation de l'application prête au public.


## Correctifs autonomes — 28 octobre (messagerie, GPS, Stripe TEST, confidentialité)

- **Messagerie** : les envois et chargements asynchrones sont liés à un compte et à une conversation. Un résultat ou échec d'un ancien utilisateur ne vide plus le brouillon ni les statuts du nouveau compte. Trois tests dans `tests/messagerie-securite.test.cjs`.
- **Actualisation client** : suppression d'un second appel aux avis ; `sgDemand.refreshClient()` est déjà enveloppé par `sgReviews`. Diminution des lectures réseau redondantes.
- **GPS** : le bouton Arrêter la recherche GPS ne vide plus les annonces du compte client. Seule la déconnexion ou le changement de compte purge la vue privée (`stop({clearClient:true})`). Deux scénarios ajoutés aux tests GPS.
- **Données du prototype** : nouvelle page `donnees-test.html` liée depuis Compte et Aide. Le texte explique quelles données fictives sont traitées, l'arrondi GPS et l'absence actuelle de purge automatique des annonces en base. **Ce n'est pas une politique RGPD juridique complète.**
- **Stripe SANDBOX** : les liens Checkout / Connect et les résultats de statut reçus après déconnexion ou changement de compte sont ignorés ; `reset()` remet l'interface dans un état neutre. Aucun passage en production ni activation de paiement réel.
- **Automatisation** : quatre nouveaux scénarios `tests/stripe-session.test.cjs`, corrigés pour attendre les requêtes simulées explicitement et non un nombre fixe de microtâches. Dernier run connu réussi : `31cb6f2c7c4b83b7465eab969366a6d6a5d048db` (GitHub Actions). Tests réels à deux appareils et Stripe TEST restent à faire.


## Fonctionnalités application ajoutées — 28 octobre 2026 (suite)

- Messagerie TEST : trois modèles de réponses rapides pour client et chauffeur, insérés dans le brouillon **sans envoi automatique** ; limite 500 caractères et blocage hors connexion.
- Nouveau message fictif : indicateur dans la conversation et bannière de navigation vers la section concernée. Aucune notification push en arrière-plan ni contenu privé dans la bannière ; nettoyage à la déconnexion.
- Missions chauffeurs TEST : classement local par proximité, tarif indicatif ou distance du trajet fictif, sans nouvelle sollicitation du GPS. Mémorisation locale du rayon (5 à 50 km) et du tri uniquement, avec remise à zéro et sans stockage d'identité ou de position.
- Publication d'annonces fictives : refus explicite hors connexion avant demande GPS.
- Parcours client : bouton « Modifier ma simulation » pour préremplir le formulaire depuis un trajet local ; ne modifie **pas** une annonce déjà publiée.
- Assistance : accès direct aux signalements de TEST depuis le client et le chauffeur, sans identifiant dans l'URL, avec rappel du 112 en cas de danger.
- Le projet compte **133 tests automatiques réussis** au dernier contrôle. Les scripts navigateur et validations sont des tests de prototype, pas une validation métier ou sécurité complète.

### Vérification mobile

- Android : APK DEBUG compilée et manifeste inspecté sur GitHub ; essai d'émulateur encore à suivre après correction du mode de capture d'écran.
- iOS : compilation sur simulateur et lancement du programme dans un simulateur iPhone réussis ; capture d'écran archivée. **Aucune IPA distribuable** ni installation sur iPhone réel.
- Le GPS réel sur appareils, les confirmations e-mail et le comportement en conditions réseau réelles restent à tester.


## Suite application SAMGO TEST — 28 octobre 2026 (parcours mobile et GPS natif)

- **Mes courses :** filtre local de simulations selon état (attente, chauffeur choisi, terminée, annulée, expirée), sans requête réseau supplémentaire et avec compteur des cartes affichées.
- **Réponses chauffeurs :** bannière discrète si de nouveaux chauffeurs répondent après la première consultation ; uniquement lors des actualisations visibles, sans notification push ni GPS, réinitialisée au changement de compte ou à la déconnexion.
- **Connexion :** bouton afficher/masquer le mot de passe, masqué par défaut et après changement de mode de connexion, sans stocker la valeur.
- **GPS :** une mesure annoncée comme imprécise de plus de 5 000 mètres empêche la recherche chauffeur et la publication client ; message de correction clair. Le client voit la durée indicative restant avant l'expiration d'une annonce fictive.
- **Application native TEST v0.1.2 :** intégration de `@capacitor/geolocation@8.2.4` pour Android et iPhone. Le GPS natif n'est appelé que depuis un clic volontaire dans Missions ou Publier ; le GPS web reste disponible pour la PWA. Aucun suivi ni permission GPS en arrière-plan.
- **iOS :** libellés Info.plist attendus par Capacitor Geolocation 8, y compris `NSLocationAlwaysAndWhenInUseUsageDescription` exigé par le plugin ; SAMGO ne lance ni demande d'accès permanent ni `watchPosition`. Ces libellés ne prouvent pas que les permissions fonctionnent sur un appareil réel.
- **Diagnostic appareil :** distingue module GPS natif et navigateur sans demander de permission ni position, montre un message si la compilation ne fournit pas le plugin.
- **Automatisation :** 154 tests Node réussis sur 154 pour la dernière validation `40766577326` ; compilations Android/iOS 0.1.2 demandées, succès natif et essais GPS sur téléphones réels **non encore confirmés** lors de ce suivi.
- **Blocages conservés :** deux vrais téléphones, parcours e-mail, habilitations et assurances, tests de courses en conditions réelles, signatures de distribution et validation juridique/paiements. Aucun de ces éléments n'est considéré comme terminé.


## Dossier chauffeur : premier contrôle sécurisé — 28 octobre 2026 (nouveau tchat)

- Supabase `SAMGO-V3` : le bucket `samgo-driver-documents` est **privé**, limité à 5 Mo et à des formats image/PDF ; **0 objet** lors du contrôle. Des règles RLS de consultation propres au chauffeur, et une règle de lecture réservée à l'administrateur, étaient déjà configurées. Cela ne prouve pas encore que l'ensemble du parcours soit sûr en production.
- L'interface Profil chauffeur affiche désormais un **état de dépôt** pour permis, justificatif de domicile et selfie, obtenu **uniquement à la demande** par le point d'accès authentifié Supabase Storage `/object/list`, sur les dossiers de la personne connectée.
- L'application ne télécharge **aucun contenu** de justificatif, n'ouvre aucun fichier, et n'affiche que « Aucun dépôt » ou « Dépôt détecté — NON VÉRIFIÉ ». Aucun permis/identité/assurance n'est validé par ce contrôle. Les réponses de l'ancien compte sont ignorées après déconnexion ou changement d'utilisateur.
- Aucune interface de collecte de vraies pièces d'identité, de permis, de selfie ou de RIB n'est ouverte. Un prestataire spécialisé, le consentement et la durée de conservation sont à définir pour la vérification réelle.
- Le RIB/IBAN devra passer par **Stripe Connect** ou un prestataire autorisé, pas par le coffre de fichiers SAMGO. Une migration Supabase `samgo_bloquer_depot_rib_hors_stripe` a ajouté deux politiques Storage **RESTRICTIVE** qui bloquent les `INSERT` et `UPDATE` du dossier `rib` dans le bucket SAMGO, sans affecter les autres buckets. Les nouvelles politiques ont été confirmées par lecture SQL après migration.
- Nouveau module `assets/dossier-chauffeur-test.js`, interface dans `index.html` et tests `tests/dossier-chauffeur-test.test.cjs` : présence/non-vérification, blocage sans compte candidat, annulation d'un résultat tardif après changement de compte, absence d'upload de documents sensibles. Ajout au contrat des actions HTML.
- Les essais **réels** sur deux téléphones, l'accès Storage avec un chauffeur connecté réel, la vérification par un tiers, la réception d'un RIB chez Stripe, la politique RGPD et les assurances demeurent à valider avant toute vraie course.


## Reprise des tests Stripe Connect TEST — 28 octobre 2026, contrôle complémentaire

- Environnement Stripe **sandbox uniquement** : un seul compte chauffeur SAMGO rattaché dans Supabase. Ce compte a soumis ses données fictives, mais Stripe retourne `verification_failed_keyed_identity` ; encaissements et virements restent **désactivés**. L'autre compte de test visible chez Stripe n'a pas fini son onboarding.
- **0 Checkout Stripe TEST**, **0 PaymentIntent**, **0 paiement de simulation enregistré** dans SAMGO au moment du contrôle. Aucun paiement réel ou virement n'a été déclenché. Ne pas annoncer le paiement de bout en bout comme testé.
- L'endpoint webhook Stripe est activé **en mode test**, abonné à `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` et `checkout.session.async_payment_failed`.
- **Edge Function** `samgo-stripe-webhook` version **5**, déployée et active. Le code est aussi suivi dans `supabase/functions/samgo-stripe-webhook/index.ts`. Outre la signature HMAC de Stripe, le contrôle des identifiants, du montant et des participants, les changements de statut sont désormais autorisés **uniquement depuis `checkout_ouvert`**, via une condition SQL de mise à jour atomique. Un événement tardif ou concurrent ne doit pas écraser un statut déjà finalisé.
- **Edge Function** `samgo-stripe-sandbox` version **10**, active et avec JWT obligatoire. Checkout utilise les moyens de paiement dynamiques plutôt qu'une liste codée en dur ; les confirmations restent dépendantes des webhooks.
- **6 vérifications automatisées statiques** ajoutées dans `tests/stripe-webhook-guard.test.cjs` et `tests/stripe-checkout-guards.test.cjs` et exécutées en sandbox JavaScript isolé : 6/6 passent (contrats de code seulement, **pas un paiement réel ni une intégration Stripe de bout en bout**).
- **Bloquant** : utiliser exclusivement les procédures et valeurs fictives de vérification prévues par Stripe dans l'inscription hébergée, puis tester une vraie session Checkout SANDBOX, un paiement de test, le webhook signé et la non-duplication du paiement sur deux comptes. Ne jamais demander ni exposer de pièce d'identité ou de RIB réels pour débloquer ce prototype.


## Agent facturation et signalements privés — 28 octobre 2026 (version TEST)

- **Facturation :** migration Supabase `samgo_factures_signalements_agents_test`. Le paiement `paye_test` confirmé déclenche automatiquement **un brouillon interne**, unique par simulation et uniquement visible en administration. Montant fictif, commission 0 %, TVA `a_confirmer`, aucune facture numérotée, aucune émission autorisée, aucun e-mail. Ne pas activer les factures sans identité légale de l'émetteur, régime de TVA du chauffeur et de SAMGO, mandat de facturation, conditions de service et éventuelle plateforme de facturation électronique conforme.
- **Signalements :** `samgo_signalements_test` stocke un témoignage uniquement si le plaignant est **client ou chauffeur du trajet de test** visé. RLS : le déclarant voit son dossier, l'administrateur voit et traite tous les dossiers, la personne visée ne voit **ni le dossier, ni l'identité du déclarant, ni le texte de la plainte**. Un compte ne peut pas fabriquer de signalement sur un compte étranger à son trajet. Un seul signalement par déclarant/cible/trajet.
- **Modération humaine :** un signalement seul n'entraîne aucune sanction ni avertissement. L'administrateur confirme ou rejette manuellement, puis le trigger crée une notification texte générique et privée (`samgo_notifications_test`), sans identité du déclarant. Au **3e avertissement validé**, création d'un dossier `samgo_escalades_test` pour examen humain, sans suspension automatique. Les cas urgents apparaissent en priorité dans le tableau d'administration ; ce n'est pas un centre d'urgences ni une alerte push active.
- **Interfaces :** `aide.html` propose le signalement confidentiel dans les trajets de test de l'utilisateur ; `mes-alertes.html` montre les notifications personnelles de TEST ; `samgo-admin 2.html` affiche les signalements à examiner, les escalades et les brouillons fiscaux. L'interface d'administration utilise un module externe `assets/admin-agents-test.js` avec dépendances d'authentification injectées dans sa fermeture pour éviter de rendre un jeton global. `index.html` inclut le lien aux alertes. Le bundle Capacitor embarque également `mes-alertes.html`.
- **Invités :** un client/chauffeur invité qui a activé un compte SAMGO voit ses alertes dans son espace personnel. Un invité **sans compte et sans contact vérifié** ne peut pas recevoir de notification privée ni d'e-mail à ce stade. Un canal de vérification d'e-mail et un prestataire d'e-mails transactionnels restent nécessaires.
- **Sécurité :** tables RLS activées, privilèges `anon` supprimés, accès aux brouillons fiscaux et escalades limité à l'admin. Aucun document personnel ni e-mail réellement envoyé. L'identité ne figure pas dans les notifications, mais **l'anonymat absolu ne peut être garanti**, par exemple si le destinataire déduit qui s'est plaint.
- **Tests :** `tests/agents-samgo-confidentialite.test.cjs` contient 5 contrôles statiques **réussis (5/5)** ; scripts HTML et JS analysés sans erreur de syntaxe. Confirmé dans Supabase : triggers `samgo_facturation_test_on_paid` et `samgo_signalements_agent_after_update`, RLS sur 4 tables ; 0 rapport, 0 notification, 0 escalade, 0 brouillon en base après installation. Les scénarios fin à fin avec deux véritables comptes n'ont pas encore été réalisés.
- **Blocages avant e-mails ou vraies factures :** confirmation de l'entreprise émettrice, régime TVA et TVA applicable, facturation électronique, consentement/mandat éventuel du chauffeur, fournisseur mail transactionnel/domaine vérifié, traitement RGPD, adresse/contact vérifié du destinataire. Aucune dépense, aucune notification e-mail, aucune facture fiscale ou paiement réel n'ont été activés.
