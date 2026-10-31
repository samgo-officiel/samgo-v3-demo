# SAMGO — Étape 1 : e-mails de connexion (diagnostic du 31/10/2026)

## État vérifié
- Projet Supabase `SAMGO-V3` actif.
- La page `index.html` contient inscription, connexion et gestion du lien de confirmation.
- `assets/recuperation-compte-test.js` gère la demande de réinitialisation et la saisie d'un nouveau mot de passe.
- Le SMTP externe n'est **pas validé/configuré** : aucun envoi réel fiable ne peut être annoncé comme opérationnel.
- Les messages e-mail `429` existent ; le fournisseur par défaut Supabase n'est **pas adapté à une ouverture publique** et n'envoie qu'aux adresses autorisées de l'équipe sans SMTP personnalisé.
- Des correctifs de délai réseau (20 s), des messages français sur l'erreur « adresse non autorisée » et des tests ont été préparés dans une branche distincte.

## À configurer dans le tableau de bord privé (ne jamais transmettre de secrets dans le chat ou GitHub)

1. Choisir un fournisseur SMTP transactionnel compatible avec Supabase (par exemple Brevo ou Resend) et un domaine expéditeur vérifié.
2. Si un identifiant ou une clé SMTP a déjà été communiqué(e) ailleurs, le/la révoquer et **créer un nouvel identifiant secret**.
3. Vérifier le domaine d'envoi côté fournisseur : SPF, DKIM et DMARC selon ses instructions DNS.
4. Ouvrir [Supabase — SMTP Settings](https://supabase.com/dashboard/project/tgwdycgwgfisuskxwkvk/auth/smtp) et configurer le serveur, port, utilisateur, mot de passe privé, nom d'expéditeur `SAMGO` et adresse expéditrice réelle validée.
5. Ouvrir [Supabase — URL Configuration](https://supabase.com/dashboard/project/tgwdycgwgfisuskxwkvk/auth/url-configuration) :
   - Site URL : `https://samgo-officiel.github.io/samgo-v3-demo/`
   - Redirect URLs : autoriser **exactement** `https://samgo-officiel.github.io/samgo-v3-demo/` pour les essais ; ajouter les URL de production uniquement après déploiement.
6. Dans [Supabase — Auth Providers](https://supabase.com/dashboard/project/tgwdycgwgfisuskxwkvk/auth/providers), vérifier que la confirmation d'e-mail est **activée** (ne pas la désactiver pour contourner les limites).
7. Dans [Supabase — Rate Limits](https://supabase.com/dashboard/project/tgwdycgwgfisuskxwkvk/auth/rate-limits), vérifier les quotas après SMTP, sans augmenter aveuglément les plafonds ; envisager CAPTCHA si ouverture au public.
8. Dans [Supabase — Email Templates](https://supabase.com/dashboard/project/tgwdycgwgfisuskxwkvk/auth/templates), utiliser les modèles officiels et leurs liens de confirmation/récupération, sans insérer d'URL ou de secrets erronés.

## Recette avant validation de l'étape 1

- [ ] Un **nouveau** compte de test reçoit la confirmation, clique le lien et se connecte avec le bon rôle.
- [ ] Un compte déjà existant n'est pas présenté abusivement comme nouveau.
- [ ] « Mot de passe oublié » envoie un lien réel pour une adresse contrôlée par le testeur.
- [ ] Le lien ouvre SAMGO, le nouveau mot de passe est enregistré ; l'ancien est refusé.
- [ ] Un lien expiré ou invalide affiche un message clair.
- [ ] Un refus temporaire (429) informe sans promettre un e-mail non envoyé.
- [ ] Test sur iPhone et Android / réseau faible, en deux comptes distincts.
- [ ] Aucun secret SMTP, jeton d'authentification ou mot de passe n'apparaît dans les commits/logs.

**Règle de sortie :** ne cocher « e-mails opérationnels » qu'après une preuve de réception et d'utilisation réelle du lien. Ne pas activer de courses ou paiements LIVE.

Documentation : https://supabase.com/docs/guides/auth/auth-smtp
