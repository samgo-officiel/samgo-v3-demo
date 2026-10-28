# SAMGO — Plan de finalisation en 8 chantiers

Date de contrôle : 28 octobre 2026. **Projet en démonstration seulement. Aucune course réelle, aucun paiement réel.**
Ce fichier est une liste technique et opérationnelle, **pas un avis juridique ni une attestation d'assurance**. Les exigences peuvent évoluer.

## 1. Stripe Connect (test puis seulement après validation, production)
- [x] Connecter le compte Stripe sandbox au compte chauffeur de démonstration SAMGO.
- [x] Créer les fonctions serveur d'onboarding et de Checkout *test*, webhook signé et tables RLS.
- [x] Bloquer les transactions réelles (clé `sk_test_` uniquement, frais/commission simulés).
- [ ] Corriger la vérification d'identité **fictive** refusée par Stripe, en utilisant uniquement le parcours et les valeurs **officiels de test**. Ne pas transmettre de vraie pièce d'identité dans une simulation.
- [ ] Tester la création d'un lien Connect, la confirmation des capacités et un Checkout avec une carte de test, puis la réception d'un webhook signé.
- [ ] Gérer remboursement, litiges, idempotence, rapprochement et statut des courses.
- [ ] Définir la prise en charge des frais Stripe : avec 0 % de commission, les frais peuvent rester à la charge de SAMGO.
- [ ] Autoriser explicitement le passage en production uniquement après validations juridiques et comptables.
- **Décision maintenue :** 0 % de commission SAMGO et 100 % du tarif théorique au chauffeur, avant taxes/frais. Passage éventuel à 10 % NON automatique.

## 2. Vérifier le parcours avec deux téléphones
- [x] Développer comptes clients/chauffeurs, intérêt, sélection, suivi fictif, fin/annulation et avis TEST.
- [x] Protéger en base les échanges par participant après sélection du chauffeur.
- [x] Tester l'accès du client et du chauffeur à la messagerie de TEST, et le refus d'un troisième compte (transaction SQL annulée).
- [ ] Sur deux appareils réels, tester les séquences complètes avec GPS accordé/refusé, reconnexion, réseau lent, changement d'utilisateur et onglet fermé.
- [ ] Tester les écrans iPhone Safari et Android Chrome, clavier virtuel, accessibilité et erreurs de connexion.

## 3. Carte et géolocalisation
- [x] Géolocalisation déclenchée volontairement par utilisateur.
- [x] Positions clients approx. à 2 décimales, sans point chauffeur précis dans la base.
- [x] Recherche géographique bornée en base, zone de recherche chauffeur centrée sur position arrondie à 0,1 degré, filtrage précis final dans le navigateur.
- [x] Index géographique pour les annonces TEST.
- [ ] Adresse réelle de départ et d'arrivée, géocodage, navigation/itinéraire fiable, kilométrage routier, ETA, contrôle anti-fraude.
- [ ] Choisir une API cartographique selon licence, confidentialité, quota et budget approuvés. Ne pas ajouter de fournisseur payant implicitement.

## 4. Alertes, messagerie et incidents
- [x] Nouvelle messagerie privée **TEST** entre client et chauffeur sélectionné (pas de messages avant sélection ; pas d'envoi après clôture).
- [x] Messages limités à 500 caractères et historisation bornée à 40 derniers éléments dans l'interface ; rendu sans HTML arbitraire.
- [x] Actualisation tant que SAMGO reste ouvert et visible.
- [ ] Tester chat en conditions réelles sur deux comptes.
- [ ] Notifications push quand application fermée : serveur, abonnements, consentement et tests iOS/Android. Aucun push actif aujourd'hui.
- [ ] Modération, blocage, signalements du chat, support incidents graves et conservation limitée des échanges.
- [ ] Définir puis implémenter suppression/archivage et demande RGPD.

## 5. Vérification chauffeurs et administration
- [x] Candidatures et approbation **de test** ; elles ne valent pas vérification réelle.
- [ ] Workflow fiable d'identité, permis valide, statut professionnel/immatriculation, justificatifs adaptés, suspendre/refuser, contrôles périodiques, journal d'administration.
- [ ] Collecte sécurisée des justificatifs chez un prestataire agréé ou stockage strictement protégé : ne jamais mettre ces documents dans le dépôt public ni dans une table exposée sans contrôle.
- [ ] Support opérationnel et gestion d'accident/conflits ; horaires et procédure d'astreinte.

## 6. Droit, assurance et sécurité de conduite — BLOQUANT AVANT DE VRAIES COURSES
- [ ] **Faire qualifier juridiquement le service** de chauffeur conduisant le **véhicule appartenant au client** : obligations professionnelles, permis, statut et éventuels régimes de transport à vérifier par un professionnel. Ne pas présumer que c'est identique à un VTC classique, ni que le régime VTC est forcément exclu.
- [ ] **Assureur/courtier :** faire confirmer par écrit la garantie pour chauffeur professionnel rémunéré sur véhicule du client, dommages aux tiers et au véhicule, conducteur, franchise, vols, valeur plafond (hypothèse de travail 30 000 €), couverture France, retour du chauffeur et responsabilité plateforme. Une police auto standard peut restreindre le prêt de volant.
- [ ] Vérifier indépendance économique réelle des chauffeurs, transparence du prix, CGU clients/chauffeurs, clauses de responsabilité, garanties, déclarations, fiscalité, RGPD, informations précontractuelles.
- [ ] Prévoir les obligations applicables aux plateformes facilitant les revenus des auto-entrepreneurs, y compris le prélèvement de cotisations annoncé par l'Urssaf au **1er janvier 2027**, selon qualification et périmètre exacts.
- [ ] Garantir une gestion des informations de localisation claire, limitée et proportionnée, avec retrait des accès et durée de conservation définie.

**Références officielles à remettre au conseil juridique / courtier :**
- Assurance / prêt du volant : https://www.service-public.gouv.fr/particuliers/vosdroits/F2632
- Assurance responsabilité civile : https://www.service-public.gouv.fr/particuliers/vosdroits/F31258
- Différence indépendant/salarié plateforme : https://travail-emploi.gouv.fr/travailleurs-independants-ou-salaries-etat-du-droit-sur-la-qualification-des-travailleurs-des-plateformes-de-mise-en-relation
- Risque de requalification : https://travail-emploi.gouv.fr/le-recours-abusif-aux-travailleurs-independants
- Obligations plateformes auto-entrepreneurs : https://www.urssaf.fr/accueil/tiers-declarant/plateforme-numerique.html
- CNIL / GPS mobile (2026) : https://www.cnil.fr/fr/geolocalisation-applications-mobiles-quelles-regles

## 7. Paiements et modèle économique réel — NON ACTIVÉ
- [x] Paramétrage **fictif** 0 % SAMGO / 100 % chauffeur, affichages calculés avant frais et taxes.
- [x] Sécurité serveur : un chauffeur Stripe non vérifié ne peut pas recevoir un Checkout TEST depuis le backend.
- [ ] Facturation comptable et TVA, réconciliation des versements, modèle de frais Stripe Connect et provisions pour remboursements/fraude.
- [ ] Validation juridique du flux d'encaissement et du modèle contractuel avant toute activation live.

## 8. Qualité, application mobile et lancement
- [x] Démonstration web accessible dans un navigateur, manifeste PWA, iconographie SVG.
- [ ] Audit accessibilité, performance, erreurs réseau, sauvegarde, rétention et tests d'endurance.
- [ ] Vérifier installation PWA sur téléphone, icône PNG 192 désormais ajoutée, icône PNG 512 à prévoir, navigateur hors connexion, absence de cache de données privées et mises à jour.
- [ ] Construire et signer les véritables apps iOS/Android ou choisir une PWA, en fonction du budget et des fonctionnalités push.
- [ ] Créer comptes développeurs officiels si nécessaire (coûts potentiels, uniquement après accord), revoir politiques de publication.
- [ ] Lancer d'abord un test contrôlé sans course réelle ; ouverture au public uniquement après assurance, juridique, KYC et paiements vérifiés.

## Sécurité et état de préparation

- Les tables TEST sont protégées par RLS, et la messagerie refuse les comptes non participants.
- La protection Supabase Auth contre les mots de passe divulgués est encore désactivée. À activer et tester selon plan/console : https://supabase.com/docs/guides/auth/password-security
- Trois anciennes tables ont RLS mais aucune politique ; elles sont fermées aux rôles clients. Ne pas les rouvrir sans examen.
- Une app public-facing avec route de démonstration n'est **pas un lancement de service**. Tant que les étapes rouges ne sont pas fermées, annoncer systématiquement « TEST » et refuser les missions réelles.

## Prochaines validations uniquement réalisables avec le propriétaire

- [ ] Confirmation e-mail et récupération du mot de passe depuis une véritable boîte mail contrôlée.
- [ ] Parcours complet client/chauffeur approuvé avec deux téléphones et localisation accordée/refusée.
- [ ] Corriger les paramètres Auth (URL de retour et protection mots de passe divulgués) dans Supabase si encore nécessaires.
- [ ] Finaliser le compte Connect Stripe **fictif** avec les données officiellement prévues par Stripe pour les tests, puis Checkout et webhook, sans pièce d'identité réelle.
- [ ] Faire confirmer par écrit assurance, activité réglementée, contrat chauffeur, responsabilités et régime de plateforme.
- [ ] Décider des prix, frais Stripe, récompense fidélité et fournisseurs payants éventuels avant leur activation.
