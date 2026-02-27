

# Plan : Correction temps reel + retour a Paystack

## Probleme 1 : Les etats ne changent pas en temps reel

La table `service_bookings` n'est **pas ajoutee** a la publication Supabase Realtime (`supabase_realtime`). Les subscriptions Realtime dans `ClientProfile.tsx` et `ClientBookingDetailSheet.tsx` ne recoivent donc aucun evenement.

**Correction** : Ajouter `service_bookings` a la publication realtime via une migration SQL :

```text
ALTER PUBLICATION supabase_realtime ADD TABLE service_bookings;
```

## Probleme 2 : Remettre Paystack pour tous les paiements

Remplacer tous les appels `orange-money-payment` par `paystack-payment` dans 6 fichiers frontend, et adapter la logique (reference Paystack via URL au lieu de sessionStorage Orange Money).

### Fichiers a modifier

#### 1. `src/pages/PaymentCallback.tsx`
- Remplacer la verification Orange Money par Paystack
- Utiliser `searchParams.get('reference')` (Paystack met `?reference=xxx` dans l'URL de retour)
- Appeler `paystack-payment` avec `action: 'verify'` + `reference`
- Supprimer la lecture de `sessionStorage` pour `om_order_id` / `om_pay_token`
- Garder la logique de mise a jour des `service_bookings` et `pending_payouts` en cas de succes

#### 2. `src/pages/Checkout.tsx` (ligne ~292)
- Remplacer `orange-money-payment` par `paystack-payment`
- Utiliser `data.authorization_url` au lieu de `data.payment_url`
- Stocker `data.reference` en sessionStorage comme `paystack_reference`
- Supprimer les references `om_order_id`, `om_pay_token`

#### 3. `src/pages/ServiceBooking.tsx` (ligne ~267)
- Remplacer `orange-money-payment` par `paystack-payment`
- Adapter les champs de reponse (`authorization_url`, `reference`)
- Stocker le `reference` en sessionStorage et `payment_type`

#### 4. `src/components/orders/ClientOrderDetailSheet.tsx` (ligne ~152)
- Remplacer `orange-money-payment` par `paystack-payment`
- Adapter les champs de reponse

#### 5. `src/components/orders/ClientBookingDetailSheet.tsx` (ligne ~233)
- Remplacer `orange-money-payment` par `paystack-payment`
- Adapter les champs de reponse
- Stocker `booking_id` et `completion_type` en sessionStorage pour la verification callback

#### 6. `src/components/tokens/BuyTokensDialog.tsx` (ligne ~47)
- Remplacer `orange-money-payment` par `paystack-payment`
- Adapter les champs de reponse

#### 7. `src/components/payment/PaystackCheckout.tsx` (ligne ~69)
- Remettre l'appel vers `paystack-payment`
- Utiliser `authorization_url` et `reference`

### Adaptations cles Paystack vs Orange Money

| Element | Orange Money | Paystack (retour) |
|---------|-------------|-------------------|
| Fonction edge | `orange-money-payment` | `paystack-payment` |
| URL de paiement | `payment_url` | `authorization_url` |
| Reference | `order_id` + `pay_token` | `reference` |
| Callback | sessionStorage | `?reference=xxx` dans l'URL |
| Verification | `order_id` + `pay_token` | `reference` |
| Montants | FCFA entiers | FCFA x100 (kobo) cote backend |

### Textes a adapter
- `ServiceBooking.tsx` : "A payer via Orange Money" -> "A payer en ligne"
- Boutons "Payer avec Orange Money" -> "Payer maintenant"

### Ce qui ne change PAS
- L'edge function `paystack-payment` existe deja et est fonctionnelle
- Les triggers de base de donnees (`sync_order_payment_from_transaction`) restent inchanges
- La logique metier (acompte/solde) reste identique
- L'edge function `orange-money-payment` reste deployee mais ne sera plus appelee

