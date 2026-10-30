# SAMGO V2.0 — Audit technique et reprise du chantier
**Date : 30 octobre 2026 — projet en TEST uniquement**

> SAMGO est un prototype de mise en relation. Aucune réservation, conduite ou transaction réelle n'est autorisée sur la base de ces seuls tests. Aucun secret, identité, numéro ou jeton ne doit figurer dans ce fichier.

## 1. État vérifié

| Domaine | État et preuve | Reste à valider |
|---|---|---|
| GitHub Pages | Site déployé, workflows GitHub Tests du prototype réussis | Recette manuelle complète sur deux appareils |
| Supabase | Projet SAMGO-V3 actif, annonces et candidatures enregistrées, RLS sur tables publiques | Essais RLS réels avec deux sessions distinctes; sécurité Auth |
| Annonces | Création côté serveur, carte de demandes et réponses prévues | Deux comptes séparés, GPS consenti, réponse puis sélection |
| Messagerie | Module avec conversations limitées aux participants de la simulation, tests automatisés | Échange effectif entre deux téléphones sur le vrai serveur |
| Paiements | Stripe en environnement sandbox, QR lié à Checkout TEST, validation serveur prévue | Chauffeur Connect vérifié et test de paiement de bout en bout |
| Mobile | PWA et préparation Capacitor, builds de diagnostic dans GitHub Actions | Tests terrain et distribution iOS/Android |
| Assurance/juridique | Ébauches de conditions et protections applicatives | Assurance adaptée à la conduite du véhicule du client, étude réglementaire et documents contractuels |

**Mesures serveur lors de cet audit :** 1 annonce TEST active, 1 chauffeur de test approuvé, 0 réponse, 0 choix, 0 message et 0 paiement Stripe TEST. Ces nombres sont temporaires et ne constituent pas une validation du parcours.

## 2. Correctifs intégrés à la V2.0

- **Parcours guidé (Courses)** : bouton « Vérifier mon parcours TEST » indiquant connexion, annonce publique, réponses, sélection et conditions d'accès au chat. Aucun GPS ni message envoyé automatiquement.
- **Comptes distincts** : signal explicite lorsqu'un chauffeur ne voit que ses propres annonces. Un chauffeur ne doit jamais accepter sa propre demande.
- **Réduction des appels réseau** : réutilisation des trois lectures annonces/réponses/sélections déjà récupérées pour l'écran d'avis client.
- **Gestion 4G lente** : expiration native des requêtes au bout de 20 s lorsque le navigateur le permet, avec message d'erreur compréhensible.
- **Authentification** : titre uniforme pour client et chauffeur, ancien message d'inscription effacé au changement d'onglet, signalement plus clair du quota d'e-mails et retour Gmail vers le formulaire de mot de passe.
- **Annonces en double** : vérification préalable des annonces actives avant une nouvelle publication; aucune sollicitation GPS pour un doublon. Protection applicative uniquement : prévoir une garantie serveur avant ouverture.
- **Recette automatisée deux comptes** : simulations de deux sessions HTTP indépendantes avec backend fictif, dont réponses et chat. Cette recette n'est **pas** un essai du vrai service Supabase, ni un paiement réel.

## 3. Bloqueurs réels — intervention du propriétaire ou d'un prestataire

1. **E-mails** : configurer un SMTP externe (Brevo) dans Supabase Auth avec une identité d'expéditeur autorisée, puis faire un test d'inscription et de récupération. Le quota d'e-mails intégré à Supabase ne peut pas être contourné depuis le navigateur. Une clé SMTP ayant été envoyée dans une conversation, la révoquer et en générer une nouvelle, puis la saisir directement et secrètement dans Supabase.
2. **Deux comptes TEST** : un compte client et un compte chauffeur **distincts**, ce dernier approuvé. Aucun mot de passe, code ou document à transmettre dans un chat d'assistance.
3. **Stripe Connect TEST** : résoudre le blocage de vérification du compte chauffeur via les parcours officiels Stripe. Ne pas activer le live ni simuler une confirmation de paiement.
4. **Responsabilité et assurance** : obtenir confirmation écrite d'une couverture adéquate pour un chauffeur indépendant qui conduit la voiture du client, ainsi que de la légalité et des contrats avant le moindre trajet réel.
5. **Distribution mobile** : pour App Store/Google Play, comptes développeurs, signatures, contrôle des versions, tests physiques et procédures officielles sont encore nécessaires.

## 4. Liste de recette pour deux appareils (avec comptes différents)

1. Sur téléphone A, ouvrir **Compte**, se connecter comme client; créer une simulation avec des **lieux fictifs** et publier une demande TEST après consentement GPS approximatif.
2. Sur téléphone B, se connecter comme chauffeur approuvé; ouvrir **Chauffeur → Missions**, activer volontairement son GPS et vérifier l'apparition de la demande dans le rayon prévu.
3. B appuie sur **Je suis intéressé (TEST)**; A ouvre **Courses**, puis vérifie la réponse et sélectionne B.
4. A et B ouvrent leur **Messagerie TEST** et échangent des messages fictifs, sans identité, adresse réelle ni donnée bancaire.
5. B fait avancer le suivi TEST; A peut clore la simulation et donner une note fictive.
6. **Plus tard seulement**, quand Stripe Connect TEST sera validé, créer le Checkout TEST pour cette simulation, afficher le QR et confirmer un paiement fictif avec une carte de test officielle.

### Critères de réussite

- Les deux comptes voient **uniquement** les ressources autorisées par les règles RLS.
- Les changements d'état se propagent lorsque les écrans sont visibles et actualisés; aucun GPS n'est collecté à l'insu de l'utilisateur.
- Un compte ne peut pas accepter sa propre annonce; une conversation est inaccessible à un tiers non participant.
- Aucune carte, RIB, mot de passe, secret SMTP ou lien de récupération n'est publié dans le dépôt ou les journaux.
- Les tests GitHub sont verts **et** le parcours réel sur deux comptes de TEST fonctionne avant de parler de mise en service.

## 5. Priorités techniques suivantes (sans dépenser ni activer le live)

- Après SMTP : vérifier la délivrabilité, la vérification des e-mails et les limites dans Supabase.
- Vérifier les droits RLS avec deux comptes de test sur le serveur réel; analyser les erreurs dans les logs sans afficher de données personnelles.
- Mesurer les délais réels d'actualisation de la messagerie et des réponses sur 4G, tester navigation entre écrans et retour depuis un navigateur e-mail.
- Renforcer côté serveur le principe d'une annonce active par compte pour limiter les publications concurrentes.
- Tester caméra/QR sur deux appareils en sandbox et finaliser la gestion des sessions expirées/annulées.
- Préparer les notifications push réelles uniquement si le backend d'abonnement, les consentements et la sécurité sont prêts.
- Activer la protection contre les mots de passe compromis dans Supabase Auth quand l'option est disponible; examiner les trois tables actuellement RLS sans policy, actuellement fermées.
- Ne pas basculer la commission SAMGO de 0 % à 10 % sans décision explicite et information des chauffeurs.

**Point de vigilance :** la réussite des tests automatiques n'autorise jamais un lancement réel. Les publicités et l'acquisition restent reportées jusqu'à la finalisation du produit et de ses obligations.
