# Plan : Passage Orange Money en environnement LIVE (production)

## Objectif
Basculer l'intégration Orange Money de l'environnement sandbox (test) vers l'environnement live (production Mali), avec les nouvelles clés marchand fournies.

## Changements à effectuer

### 1. Mise à jour des secrets Supabase (4 secrets)
Mettre à jour les valeurs des secrets existants avec les nouvelles clés live :
- `ORANGE_MONEY_MERCHANT_KEY` → `1bfda118`
- `ORANGE_MONEY_CLIENT_ID` → `obdWUyZUcSIEHGEUDJiL099rzNAVgYwi`
- `ORANGE_MONEY_CLIENT_SECRET` → `0cjT9VJpzgcsgrA8XzNuGaFo6ZGJiQVWcQzOYN0EPtov`
- `ORANGE_MONEY_AUTH_HEADER` → `Basic b2JkV1V5WlVjU0lFSEdFVURKaUwwOTlyek5BVmdZd2k6MGNqVDlWSnB6Z2NzZ3JBOFh6TnVHYUZvNlpHSmlRVldjUXpPWU4wRVB0b3Y=`

Tu seras invité(e) à les saisir dans un formulaire sécurisé (les valeurs ne sont pas stockées en clair dans le code).

### 2. Mise à jour de l'edge function `orange-money-payment`
Deux changements minimes dans `supabase/functions/orange-money-payment/index.ts` :

- **Endpoint webpayment** :
  `…/orange-money-webpay/dev/v1/webpayment` → `…/orange-money-webpay/ml/v1/webpayment`
- **Endpoint transactionstatus** :
  `…/orange-money-webpay/dev/v1/transactionstatus` → `…/orange-money-webpay/ml/v1/transactionstatus`
- **Devise** : `const currency = 'OUV'` → `const currency = 'XOF'`

Aucune autre logique de paiement (acompte, solde, montants, callback, webhook) n'est modifiée.

### 3. Vérification
- Re-déploiement automatique de l'edge function
- Test d'un paiement réel de petit montant (ex. 100 FCFA) depuis un compte Orange Money Mali
- Vérification des logs de l'edge function en cas d'erreur (token OAuth, statut 200, redirection)

## Ce dont j'ai besoin de toi
1. **Confirmation** pour mettre à jour les 4 secrets (je te présenterai un formulaire).
2. **Numéro Orange Money de test** côté client pour valider un paiement réel — idéalement avec un petit montant.
3. Confirmer que **l'URL de notification (webhook)** déclarée chez Orange (côté portail merchant) pointe bien vers :
   `https://jajfuajmkjulujnwfqen.supabase.co/functions/v1/orange-money-payment` (avec `?action=webhook` géré côté code).

## Message à envoyer à Bolt.new (application mobile)

> **Migration Orange Money sandbox → live (production Mali)**
>
> Les clés marchand live ont été obtenues. Côté mobile, **aucune modification de code n'est nécessaire** : toute la bascule est faite côté backend (edge function `orange-money-payment` + secrets Supabase).
>
> Ce qui change côté serveur (pour info) :
> - Endpoint Orange Money : `/orange-money-webpay/ml/v1/...` au lieu de `/dev/v1/...`
> - Devise : `XOF` au lieu de `OUV`
> - Nouvelles clés marchand (merchant_key, client_id, client_secret, auth_header)
>
> L'app mobile continue d'appeler `supabase.functions.invoke('orange-money-payment', { action: 'initialize' | 'verify', ... })` exactement comme avant. Les montants restent en FCFA entiers (pas de x100). Le flow WebView (return_url / cancel_url + AsyncStorage de `om_order_id` et `om_pay_token`) reste identique.
>
> ⚠️ Tester avec un vrai numéro Orange Money Mali après la bascule (les comptes sandbox ne fonctionneront plus).

## Note importante
Une fois en LIVE, **les identifiants sandbox (7701900230 / MerchantWP00230) ne fonctionneront plus**. Tous les tests devront utiliser de vrais comptes Orange Money Mali avec de vrais petits montants.
