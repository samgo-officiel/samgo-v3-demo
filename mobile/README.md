# SAMGO TEST — version mobile Android et iPhone

SAMGO dispose d'une version web installable (PWA) et d'un emballage natif **Capacitor 8**
utilisant les mêmes écrans et les mêmes API de démonstration.

## Android : compilation de test

Le processus `.github/workflows/android-test.yml` utilise une machine GitHub publique pour :
1. Installer les dépendances, préparer le bundle SAMGO et générer le projet Android.
2. Déclarer uniquement les permissions de localisation **pendant l'utilisation**, appliquer les icônes SAMGO et synchroniser les fichiers.
3. Compiler `app-debug.apk`, vérifier qu'il existe puis conserver l'APK 7 jours dans les **Artéfacts** du résultat GitHub Actions.

Pour récupérer le fichier de test : ouvrir **Actions → SAMGO - Construire Android TEST → dernier run réussi → Artifacts → samgo-android-test-debug**.

L'APK est une **version DEBUG avec signature de développement**, pas une application Google Play.
Elle n'a pas encore été testée sur un vrai téléphone et n'est pas une preuve que la connexion, le GPS ou les paiements fonctionnent en situation réelle.
Elle doit rester une démonstration.

## iPhone : compilation pour simulateur

Le processus `.github/workflows/ios-simulator-test.yml` tente de construire un programme
iOS sans signature Apple, destiné au simulateur Xcode. La réussite éventuelle de ce test
ne produit pas d'IPA distribuable sur un iPhone personnel. La signature Apple et le
déploiement sur un véritable appareil nécessitent toujours une validation distincte.

## Inscription / récupération de compte

Pour éviter les liens d'e-mail vers une URL interne `localhost`, le paquet natif
redirige la confirmation de compte et la récupération de mot de passe vers
`https://samgo-officiel.github.io/samgo-v3-demo/`, via une liste blanche stricte.
Après confirmation ou réinitialisation sur le site sécurisé, l'utilisateur revient
sur SAMGO TEST et se connecte avec ses identifiants.

Ce comportement provisoire ne remplace pas de véritables **universal links / deep links**
d'application ni la validation des URL autorisées Supabase. Le site web principal
reste inchangé par ces transformations spécifiques à Capacitor.

## Ce qu'il reste absolument

- Tester APK sur téléphone Android et la future application iOS sur appareil.
- Vérifier que les permissions GPS sont réellement demandées **après un clic**.
- Valider la connexion e-mail, la récupération de compte, les échanges de messages,
  les délais réseau et la confidentialité des sessions natives.
- Ajouter des liens universels et traiter les retours des navigateurs externes.
- Confirmer l'identifiant officiel de l'application (actuellement `com.samgo.prototype`),
  la signature de distribution et les comptes développeurs, sans ouvrir un abonnement sans accord.
- Vérifier les obligations concernant les chauffeurs indépendants, l'assurance professionnelle
  couvrant les véhicules des clients, la gestion d'incidents, le droit des données et les paiements.

**Aucune course réelle, aucune facturation réelle et aucune publication App Store/Google Play
ne sont activées.** Le code natif se construit uniquement pour faire progresser le prototype.
