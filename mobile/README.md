# SAMGO TEST — préparation Android / iPhone

Ce dossier contient une préparation technique, pas encore une véritable application compilée.

## Préparé
- Configuration Capacitor 8 pour Android et iOS.
- Export des pages et ressources du site vers un dossier natif temporaire avec `node mobile/scripts/prepare-web.cjs`.
- Vérification automatique du bundle dans GitHub Actions.
- Aucun paiement réel, aucune donnée confidentielle ni publication.

## Reste à faire avant une application native utilisable
- Construire et tester le projet Android dans Android Studio.
- Construire et tester le projet iPhone dans Xcode sur Mac.
- Adapter la confirmation de compte et les liens de récupération Supabase à l'application native.
- Vérifier les permissions GPS du système, les redirections et les appels aux serveurs en situation réelle.
- Remplacer l'identifiant `com.samgo.prototype` avant toute distribution.
- Valider identité des chauffeurs, assurances, protection des données et modèle de paiement avant un service public.

Pour travailler ensuite sur une machine de développement : ouvrir le dossier `mobile`, installer les dépendances du projet et suivre la documentation officielle Capacitor.

Référence : https://capacitorjs.com/docs/getting-started

**À ce stade, aucune APK ou application iPhone signée n'est produite.**
