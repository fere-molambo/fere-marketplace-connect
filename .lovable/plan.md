
# Plan : Documentation CLAUDE.md + Migration Orange Money + Prompt Bolt.new

## Estimation : 3-4 messages (~3.5 credits) -- ca devrait passer avec 4.7 credits

---

## Etape 1 : Creer le fichier CLAUDE.md (documentation complete pour Antigravity)

Creer un fichier `CLAUDE.md` a la racine du projet contenant :

- **Architecture du projet** : React + Vite + Supabase, structure des dossiers
- **Authentification** : Roles (super_admin, admin, vendeur, livreur, membre), table `user_roles`, fonction `has_role()`
- **Systeme de paiement actuel (Paystack)** : Edge functions `paystack-payment` et `purchase-tokens`, flow en 2 etapes (acompte + solde)
- **Migration Orange Money en cours** : Quoi faire, quels fichiers modifier, les credentials, l'API Orange Money
- **Base de donnees** : Tables principales (orders, delivery_requests, payment_transactions, etc.), triggers importants (`sync_order_payment_from_transaction`, `sync_order_status_from_delivery`)
- **Logique metier** : Commandes multi-vendeur, livraison par zones, commissions, tokens, remboursements
- **Messagerie** : Tables conversations/messages, regles de contact
- **Liste des fichiers a modifier pour Orange Money** avec explications detaillees

## Etape 2 : Creer l'edge function `orange-money-payment/index.ts`

Nouvelle edge function avec 4 actions :
- **`get_token`** : Appel OAuth2 `https://api.orange.com/oauth/v1/token` avec le header Authorization Basic pour obtenir un access_token
- **`initialize`** : Generer un `order_id` unique (max 30 chars), appeler l'API Web Payment, creer l'enregistrement dans `payment_transactions`, retourner la `payment_url`
- **`verify`** : Appeler l'API Transaction Status avec `order_id`, `amount` et `pay_token`
- **`webhook`** : Recevoir les notifications POST d'Orange Money, verifier le `notif_token`, mettre a jour le statut de la transaction

## Etape 3 : Mettre a jour le frontend

Fichiers a modifier :
- **`src/pages/Checkout.tsx`** : Remplacer `paystack-payment` par `orange-money-payment`, supprimer les frais Paystack 1%, adapter les noms de variables
- **`src/pages/PaymentCallback.tsx`** : Adapter pour Orange Money (pas de `?reference=` dans l'URL, utiliser `order_id` stocke en sessionStorage)
- **`src/pages/ServiceBooking.tsx`** : Changer l'appel Paystack vers Orange Money pour les frais de deplacement
- **`src/components/payment/PaystackCheckout.tsx`** : Refactoriser en `OrangeMoneyCheckout`
- **`src/components/orders/ClientOrderDetailSheet.tsx`** : Migrer le paiement du solde
- **`src/components/tokens/BuyTokensDialog.tsx`** : Changer vers Orange Money
- **`src/components/checkout/OrderSummary.tsx`** : Texte "Paystack" -> "Orange Money"
- **`src/components/checkout/OrdersByVendorSummary.tsx`** : Supprimer les refs Paystack fees
- **`src/pages/Payments.tsx`** : Adapter la section remboursements (pas d'API auto, remboursement manuel)
- **`src/components/driver/DriverDeliveriesSection.tsx`** : Texte "Paystack" -> "Orange Money"
- **`src/components/shops/EditServiceDialog.tsx`** : Texte "Paystack" -> "Orange Money"

## Etape 4 : Mettre a jour `purchase-tokens` et `process-refund`

- **`supabase/functions/purchase-tokens/index.ts`** : Remplacer l'appel Paystack par Orange Money
- **`supabase/functions/process-refund/index.ts`** : Simplifier (Orange Money n'a pas d'API de remboursement). Garder le suivi de statut mais sans appel API externe

## Etape 5 : Mettre a jour `supabase/config.toml`

Ajouter :
```text
[functions.orange-money-payment]
verify_jwt = false
```

## Etape 6 : Stocker les secrets Orange Money

4 secrets a ajouter dans Supabase :
- `ORANGE_MONEY_CLIENT_ID`
- `ORANGE_MONEY_CLIENT_SECRET`
- `ORANGE_MONEY_MERCHANT_KEY`
- `ORANGE_MONEY_AUTH_HEADER`

## Etape 7 : Inclure le prompt Bolt.new dans CLAUDE.md

Le prompt complet pour integrer Orange Money sur les applications mobiles (client + livreur) sera inclus dans la documentation.

---

## Details techniques

### API Orange Money - Flow

```text
1. POST /oauth/v1/token -> access_token (90 jours)
2. POST /orange-money-webpay/dev/v1/webpayment -> payment_url + pay_token + notif_token
3. Redirect client vers payment_url
4. POST notif_url (webhook) -> {status, notif_token, txnid}
5. POST /orange-money-webpay/dev/v1/transactionstatus -> verification
```

### Differences cles avec Paystack
- Pas de conversion x100 (montants en unites entieres)
- Pas d'API de remboursement
- `order_id` max 30 chars, URLs max 120 chars
- Devise test : `OUV` (production : `XOF`)
- Token de paiement expire apres 10 minutes
- Pas de frais de transaction cote API (les 1% Paystack disparaissent)

### Changement majeur : suppression des frais de transaction
Paystack facturait 1% sur chaque transaction. Orange Money n'a pas ces frais cote API. Les calculs d'acompte et de solde seront simplifies :
- `advanceAmount = deliveryFee + deliveryCommission + productCommission` (sans +1%)
- `balanceAmount = subtotal` (sans +1%)
