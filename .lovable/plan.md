

# Migration Paystack → Orange Money

## Contexte
L'edge function `orange-money-payment` existe deja et est fonctionnelle. Il faut maintenant rediriger tous les appels frontend de `paystack-payment` vers `orange-money-payment` et adapter le flux de callback (Orange Money ne met pas de `?reference=` dans l'URL de retour contrairement a Paystack).

## Difference cle : flux de retour
- **Paystack** : redirige vers `return_url?reference=REF_123` → le callback lit `searchParams.get('reference')` pour verifier
- **Orange Money** : redirige vers `return_url` sans parametres → il faut stocker `order_id` et `pay_token` dans `sessionStorage` avant la redirection, puis les lire au retour pour appeler `verify`

## Fichiers a modifier

### 1. `src/components/payment/PaystackCheckout.tsx`
- Renommer le composant en `OrangeMoneyCheckout` (garder l'ancien export pour compatibilite)
- Changer l'appel de `paystack-payment` → `orange-money-payment`
- Adapter la reponse : `payment_url` au lieu de `authorization_url`
- Stocker `order_id` et `pay_token` dans sessionStorage avant redirection
- Renommer les cles sessionStorage : `om_payment_type`, `om_order_id`, `om_pay_token`

### 2. `src/pages/PaymentCallback.tsx`
- Lire `order_id` depuis sessionStorage (plus depuis `searchParams.get('reference')`)
- Appeler `orange-money-payment` avec `action: 'verify'` et `{ order_id, pay_token }`
- Adapter les noms sessionStorage (`om_*` au lieu de `paystack_*`)
- Le reste du flux (mise a jour des bookings, affichage des statuts) reste identique

### 3. `src/pages/Checkout.tsx` (ligne ~292)
- Changer `paystack-payment` → `orange-money-payment`
- `response.data.payment_url` au lieu de `authorization_url`
- Stocker `om_order_id` et `om_pay_token` dans sessionStorage
- Renommer `paystack_payment_type` → `om_payment_type`

### 4. `src/components/orders/ClientOrderDetailSheet.tsx` (ligne ~152)
- Meme changements que Checkout

### 5. `src/components/orders/ClientBookingDetailSheet.tsx` (ligne ~233)
- Meme changements + stocker `om_booking_id` et `om_completion_type`

### 6. `src/pages/ServiceBooking.tsx` (ligne ~267)
- Meme changements

### 7. `supabase/functions/orange-money-payment/index.ts`
- Changer la devise de `'OUV'` (sandbox) → `'XOF'` (production)
- Changer l'URL API de `dev/v1` → `v1` (production)
- Les secrets (MERCHANT_KEY, AUTH_HEADER, CLIENT_ID, CLIENT_SECRET) sont deja configures dans Supabase

### 8. Aucun changement sur `paystack-payment`
- On le laisse en place (pas de suppression) pour ne rien casser cote historique des transactions

## Ce qui ne change PAS
- La table `payment_transactions` et ses colonnes
- Les triggers (`sync_order_payment_from_transaction`, `handle_service_booking_payout`)
- La logique de versements et remboursements
- Les pages admin Paiements/Transactions

## Prompt Bolt.new pour l'app mobile
Tu devras donner ce prompt a Bolt :

> **Migration Paystack → Orange Money**
> Remplacer tous les appels a `paystack-payment` par `orange-money-payment`. Le payload reste le meme (`action: 'initialize'`, `amount`, `payment_type`, `related_id`, `metadata`). La reponse retourne `payment_url` (au lieu de `authorization_url`), `pay_token` et `order_id`. Ouvrir `payment_url` dans un WebView. Intercepter le retour sur `return_url` pour appeler `orange-money-payment` avec `action: 'verify'` et `{ order_id, pay_token }`. Stocker `order_id` et `pay_token` dans AsyncStorage avant d'ouvrir le WebView.

