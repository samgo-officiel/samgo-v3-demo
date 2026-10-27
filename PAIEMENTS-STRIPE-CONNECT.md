# SAMGO — intégration Stripe Connect (préparation, SANS paiement réel)

Mise à jour : 28 octobre 2026.

## Statut exact
- [x] Interface de simulation dans « Réserver » et « Chauffeur > Gains ».
- [x] Exemple 90 % chauffeur / 10 % SAMGO calculé en centimes, avec arrondi et contrôle des montants.
- [x] Calcul protégé contre les montants négatifs ou déraisonnables, testé sans requêtes au réseau.
- [ ] Compte Stripe SAMGO créé et connecté par le propriétaire.
- [ ] Intégration du système d'inscription/validation des comptes Stripe Connect chauffeur.
- [ ] Création de sessions Stripe Checkout en environnement sandbox (serveur uniquement).
- [ ] Réception et validation cryptographique des événements de paiement par webhook.
- [ ] Vérification des tarifs, statuts de mission et destinataires côté serveur.
- [ ] Remboursements, annulations, incidents, justificatifs, journal comptable et rapprochement bancaire.
- [ ] Contrats, assurances, fiscalité et conformité avant le mode réel.

## Principes du modèle envisagé

Pour un prix fictif de 20,00 € :
- Montant présenté au client : 20,00 €
- Montant théorique chauffeur : 18,00 €
- Commission théorique SAMGO : 2,00 €
- Frais de paiement, frais éventuels de Connect, TVA, charges et remboursements **non déduits**.

La commission de 10 % est une **hypothèse** et doit être validée avant la mise en production. Les barèmes Stripe peuvent dépendre du type d'intégration, de la région et des responsabilités de chacun.

## Architecture prévue, sans secret dans le navigateur

1. Le client crée une **demande validée** ; un serveur authentifié récupère l'annonce et calcule/fige le prix depuis une donnée de confiance. Le navigateur **ne doit jamais décider du prix final**.
2. Chaque chauffeur indépendant, dont l'identité et la capacité d'exercer ont été vérifiées pour la prestation, utilise une procédure d'inscription **hébergée par Stripe Connect** pour les informations financières. On ne collecte pas de RIB sur GitHub Pages.
3. Le serveur contrôle que le chauffeur assigné correspond au compte Stripe Connect configuré côté serveur. L'identifiant du destinataire de fonds ne doit jamais être librement fourni par le client.
4. L'application crée une session de paiement **test uniquement** côté serveur (ex. Supabase Edge Function, secrets stockés via Supabase). Les pages de règlement sont hébergées par Stripe. Aucun moyen de paiement n'est stocké côté SAMGO.
5. Les statuts « payé / échec / remboursé » sont mis à jour **exclusivement** sur preuve d'un événement Stripe dont la signature webhook est vérifiée, ou d'une requête serveur authentifiée à l'API Stripe. Ne jamais se fier uniquement à une URL de retour client.
6. Prévoir idempotence (aucun double prélèvement), audit, litiges, remboursements, répartition/frais, bonnes pratiques RGPD, assistance et contraintes sectorielles avant activation.
7. Ne pas déployer de fonction capable de générer des paiements avec une clé **live** avant vérifications juridiques et tests approfondis. Bloquer techniquement le mode réel jusqu'à autorisation explicite.

## Actions demandées au propriétaire — plus tard

1. Créer un compte sur https://dashboard.stripe.com/register, si aucun n'existe.
2. Basculer dans une **sandbox** / mode test Stripe ; consulter les modalités tarifaires sur https://stripe.com/fr/connect/pricing.
3. Connecter Stripe à ChatGPT si souhaité, ou configurer le compte soi-même dans le Dashboard.
4. Lorsque le compte Stripe existe, activer une solution serveur sécurisée pour la gestion des comptes Connect et les paiements de démonstration. **Ne jamais coller de clé secrète dans un chat ou dans le code public du site**.

## Mise en garde

Les écrans développés n'appellent pas Stripe. Ils ne créent aucune transaction, n'associent aucun compte bancaire et ne versent rien. Le projet reste une **démonstration** : aucune course réelle ne peut être proposée avant les assurances, les vérifications des chauffeurs, les conditions contractuelles et les obligations légales.

Références :
- https://docs.stripe.com/connect/accounts-v2
- https://docs.stripe.com/connect/testing
- https://docs.stripe.com/connect/destination-charges
- https://supabase.com/docs/guides/functions
