# CLAUDE.md — Documentation complète du projet Fere (Antigravity)

> Ce fichier est destiné à Claude/Antigravity pour comprendre le projet en profondeur.
> Dernière mise à jour : 25 février 2026

---

## 1. Architecture du projet

### Stack technique
- **Frontend** : React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend** : Supabase (PostgreSQL, Auth, Edge Functions, Storage, Realtime)
- **Paiement** : Migration en cours de **Paystack → Orange Money**
- **Routing** : react-router-dom v6
- **State** : React Query (TanStack Query) + Context API (Cart)

### Structure des dossiers
```
src/
├── components/          # Composants React réutilisables
│   ├── auth/            # ProtectedRoute
│   ├── booking/         # Réservation de services
│   ├── cart/            # Modal du panier
│   ├── checkout/        # Résumé commande, adresses, paiement
│   ├── client/          # Profil client, adresses, remboursements
│   ├── dashboard/       # StatCard
│   ├── driver/          # Interface livreur
│   ├── help/            # FAQ, tutoriels
│   ├── landing/         # Page d'accueil publique
│   ├── layout/          # Sidebar, DashboardLayout
│   ├── messaging/       # Chat temps réel
│   ├── orders/          # Tables et détails commandes
│   ├── payment/         # PaystackCheckout (→ OrangeMoneyCheckout)
│   ├── payments/        # Filtres et utils paiements admin
│   ├── reviews/         # Avis et étoiles
│   ├── settings/        # Paramètres plateforme
│   ├── shops/           # Boutiques, produits, services
│   ├── tokens/          # Achat de tokens
│   ├── ui/              # shadcn/ui components
│   ├── users/           # Gestion utilisateurs admin
│   └── vendors/         # Carte vendeur
├── contexts/            # CartContext
├── hooks/               # useAuth, useAdminAuth, useDeliveryCalculation, etc.
├── integrations/supabase/  # Client Supabase + types auto-générés
├── lib/                 # Utilitaires (distance, validators)
├── pages/               # Pages/routes de l'app
supabase/
├── config.toml          # Config des edge functions
├── functions/           # Edge functions Deno
│   ├── _shared/cors.ts  # Headers CORS partagés
│   ├── calculate-distance/
│   ├── create-user/
│   ├── delete-user/
│   ├── generate-marketing-image/
│   ├── orange-money-payment/   # NOUVEAU - remplace paystack-payment
│   ├── paystack-payment/       # ANCIEN - à supprimer après migration
│   ├── process-refund/
│   ├── purchase-tokens/
│   ├── reset-user-password/
│   └── setup-super-admin/
```

### Routes principales (App.tsx)
```
/                       → Home (landing page)
/auth                   → Login/Signup
/setup                  → Setup super admin initial
/product/:productId     → Détail produit
/service/:serviceId     → Détail service
/service/:serviceId/book → Réservation service
/produits-services      → Catalogue
/checkout               → Paiement commande
/payment/callback       → Retour après paiement
/mon-profil             → Profil client + commandes
/mes-favoris            → Favoris
/boutique/:shopId       → Boutique publique
/vendeurs               → Liste vendeurs
/aide                   → Centre d'aide
/messages               → Messagerie publique
/dashboard              → Dashboard admin/vendeur/livreur
/dashboard/users        → Gestion utilisateurs
/dashboard/shops        → Gestion boutiques
/dashboard/orders       → Gestion commandes
/dashboard/payments     → Paiements
/dashboard/transactions → Transactions tokens
/dashboard/delivery-zones → Zones de livraison
/dashboard/messages     → Messagerie dashboard
/dashboard/settings     → Paramètres
```

---

## 2. Authentification et rôles

### Rôles disponibles (enum `app_role`)
- `super_admin` : Accès total, créé via edge function `setup-super-admin`
- `admin` : Gestion utilisateurs, boutiques, commandes
- `vendeur` : Gère sa boutique, produits, services, commandes
- `livreur` : Voit les livraisons assignées, met à jour les statuts
- `membre` : Client, passe des commandes

### Tables clés
- `user_roles(user_id, role)` : Association utilisateur → rôle
- `profiles(id, nom_complet, contact, email, ...)` : Profil étendu

### Fonctions SQL utiles
- `has_role(user_id, role)` → boolean
- `get_user_roles(user_id)` → SETOF app_role
- `assign_self_role(role_name)` : Auto-inscription (vendeur, livreur, membre uniquement)

### Hooks React
- `useAuth()` : Session + user + loading
- `useAdminAuth()` : Vérifie super_admin/admin
- `useUserRoles()` : Liste des rôles de l'utilisateur courant

---

## 3. Base de données — Tables principales

### Commandes
- `orders` : Commande principale (1 par vendeur)
  - `order_number`, `user_id`, `shop_id`
  - `subtotal`, `delivery_fee`, `tva_amount`, `commission_amount`, `total_amount`
  - `advance_amount`, `advance_paid`, `balance_amount`
  - `payment_status` (pending → partial → paid)
  - `balance_payment_status` (pending → paid)
  - `payment_group_id` : Lie les commandes d'un même checkout multi-vendeur
  - `delivery_type` : "delivery" ou "pickup"
  - `status` : pending → confirmed → shipped → delivered / cancelled

- `order_items` : Lignes de commande
  - `order_id`, `product_id`, `shop_id`, `quantity`, `unit_price`, `total_price`
  - `commission_rate`, `commission_amount`
  - `selected_color`, `selected_size`, `proposed_price`

### Livraison
- `delivery_requests` : Demande de livraison (1 par commande)
  - `order_id`, `driver_id`, `zone_id`
  - `status` : pending → assigned → in_progress → picked_up → en_route_client → arrived → delivered
  - `pickup_point` (JSON), `delivery_point` (JSON)
  - `delivery_fee`, `driver_earnings`
  - `is_return` : true pour les retours

- `delivery_zones` : Zones géographiques avec centre + rayon
- `driver_zones` : Association livreur → zone

### Paiements
- `payment_transactions` : Toute transaction de paiement
  - `reference`, `amount`, `currency`, `status` (pending/success/failed/abandoned)
  - `payment_type` : order, order_balance, service_booking, tokens, subscription, commission_payout
  - `related_id` : ID de la commande/booking associé
  - `paystack_response` (JSON) → sera renommé ou réutilisé pour Orange Money

- `pending_payouts` : Paiements en attente pour vendeurs/livreurs
- `refunds` : Remboursements

### Tokens
- `user_tokens(user_id, balance)` : Solde de tokens
- `token_transactions` : Historique (achat, déduction commission)

### Boutiques
- `shops` : Boutique d'un vendeur
- `products` : Produits (price_type: fixe, negoce, en_gros)
- `services` : Services avec réservation
- `service_bookings` : Réservations de services

### Autres
- `conversations`, `messages` : Messagerie temps réel
- `favorites` : Produits/services favoris
- `shop_reviews`, `product_reviews`, `service_reviews` : Avis
- `platform_settings` : Config globale (TVA, frais livraison, commissions, logos)
- `cancellations`, `cancellation_reasons` : Système d'annulation
- `client_penalties` : Pénalités pour annulations abusives

---

## 4. Triggers importants

### `sync_order_payment_from_transaction`
Déclenché quand `payment_transactions.status` passe à `success` :
- **`payment_type = 'order'`** : Met `orders.payment_status = 'partial'`, `advance_paid = amount`
- **`payment_type = 'order_balance'`** : Met `orders.payment_status = 'paid'`, `balance_payment_status = 'paid'`, marque la livraison comme `delivered`, crée les `pending_payouts` pour vendeur et livreur
- **`payment_type = 'service_booking'`** : Met `service_bookings.payment_status = 'paid'`

### `sync_order_status_from_delivery`
Met à jour `orders.status` basé sur le statut des `delivery_requests` :
- Tous livrés → `delivered`
- Tous annulés → `cancelled`
- En transit → `shipped`
- Assignés → `confirmed`

### `handle_delivery_completed`
Quand une livraison passe à `delivered`, met l'ordre à `paid` et `delivered`.

### `handle_service_booking_completed`
Quand un service passe à `completed`, déduit les commissions en tokens du vendeur (pour paiements en espèces).

---

## 5. Logique métier

### Paiement en 2 étapes
1. **Acompte** (payé en ligne à la commande) = frais livraison + commission livraison Fere + commission produit
2. **Solde** (payé en ligne à l'arrivée du livreur) = sous-total produits

**IMPORTANT - Migration Orange Money** : Les frais Paystack de 1% sont supprimés. Les formules deviennent :
- `advanceAmount = deliveryFee + deliveryCommissionFere + productCommission` (SANS +1%)
- `balanceAmount = subtotal` (SANS +1%)

### Commissions
- **Produits** : Taux par catégorie dans `category_commissions` (défaut 10%)
- **Livraison** : `delivery_commission_fere` (20%) pour Fere, `delivery_commission_driver` (80%) pour le livreur
- **Services** : Taux par type de service dans `category_commissions`

### Multi-vendeur
- Panier peut contenir des produits de plusieurs boutiques
- 1 commande est créée par boutique (groupées par `payment_group_id`)
- 1 livraison par commande
- L'acompte total couvre toutes les commandes

### Calcul frais de livraison
```
distanceKm = totalDistanceMeters / 1000
effectivePerKm = max(feePerKm - discountPerKm * distanceKm, feePerKm * 0.3)
deliveryFee = round(baseFee + effectivePerKm * distanceKm)
```
Edge function `calculate-distance` utilise Google Maps Distance Matrix API.

### Tokens
- Les vendeurs achètent des tokens (1 token = 1 FCFA)
- Quand un client paie en espèces, la commission Fere est déduite des tokens du vendeur
- Quand le paiement est en ligne, la commission est prise directement sur le paiement

---

## 6. Migration Paystack → Orange Money (EN COURS)

### Statut actuel
- ✅ Edge function `orange-money-payment` créée avec 4 actions
- ⬜ Frontend pas encore migré
- ⬜ `purchase-tokens` pas encore migré
- ⬜ `process-refund` pas encore simplifié

### Secrets Orange Money à configurer
```
ORANGE_MONEY_CLIENT_ID      → Client ID de l'app Orange Developer
ORANGE_MONEY_CLIENT_SECRET  → Client Secret
ORANGE_MONEY_MERCHANT_KEY   → Merchant Key pour les paiements
ORANGE_MONEY_AUTH_HEADER    → Header "Basic xxx" encodé en base64
```

### API Orange Money — Flow
```
1. POST https://api.orange.com/oauth/v1/token
   → access_token (validité ~90 jours)

2. POST https://api.orange.com/orange-money-webpay/dev/v1/webpayment
   Headers: Authorization: Bearer {access_token}
   Body: { merchant_key, currency, order_id, amount, return_url, cancel_url, notif_url, lang }
   → { payment_url, pay_token, notif_token }

3. Redirect client vers payment_url (page Orange Money)

4. Orange Money envoie POST sur notif_url (webhook)
   Body: { status, notif_token, txnid }

5. POST https://api.orange.com/orange-money-webpay/dev/v1/transactionstatus
   Headers: Authorization: Bearer {access_token}
   Body: { order_id, amount, pay_token }
   → { status, txnid, ... }
```

### Différences clés avec Paystack
| Paystack | Orange Money |
|----------|-------------|
| Montants x100 (kobo) | Montants en unités entières |
| API de remboursement | Pas d'API de remboursement |
| `reference` unique | `order_id` max 30 chars |
| Pas de limite URL | URLs max 120 chars |
| Devise: XOF | Test: OUV, Prod: XOF |
| Frais 1% | Pas de frais API |
| Callback: `?reference=xxx` | Callback: URL simple, vérifier via `pay_token` |

### Fichiers frontend à modifier

#### 1. `src/pages/Checkout.tsx`
- Remplacer `supabase.functions.invoke("paystack-payment", ...)` par `"orange-money-payment"`
- Supprimer `advancePaystackFees` et `balancePaystackFees` (les 1%)
- Simplifier : `advanceAmount = totalDelivery + deliveryCommissionFere + totalProductCommission`
- Simplifier : `balanceAmount = totalAmount` (= subtotal produits)
- Stocker `om_order_id` et `om_pay_token` en sessionStorage au lieu de `paystack_reference`
- Rediriger vers `data.payment_url` au lieu de `data.authorization_url`

#### 2. `src/pages/PaymentCallback.tsx`
- Orange Money ne met pas `?reference=xxx` dans l'URL de retour
- Utiliser `sessionStorage.getItem('om_order_id')` et `om_pay_token` pour vérifier
- Appeler `orange-money-payment` avec `action: 'verify'` + `order_id` + `pay_token`
- Adapter les clés sessionStorage : `om_order_id`, `om_pay_token`, `om_payment_type`

#### 3. `src/components/payment/PaystackCheckout.tsx` → Renommer en `OrangeMoneyCheckout.tsx`
- Changer l'appel vers `orange-money-payment` avec `action: 'initialize'`
- Stocker `om_order_id` et `om_pay_token` en sessionStorage
- Rediriger vers `data.payment_url`

#### 4. `src/components/orders/ClientOrderDetailSheet.tsx`
- Ligne ~152 : Changer `"paystack-payment"` → `"orange-money-payment"`
- Adapter les champs : `payment_url` au lieu de `authorization_url`

#### 5. `src/components/tokens/BuyTokensDialog.tsx`
- Changer `supabase.functions.invoke('purchase-tokens', ...)` (le purchase-tokens doit aussi être migré)
- Ou appeler directement `orange-money-payment` avec `payment_type: 'tokens'`
- Changer le texte "Payer avec Paystack" → "Payer avec Orange Money"

#### 6. `src/components/checkout/OrdersByVendorSummary.tsx`
- Supprimer les props `advancePaystackFees` et `balancePaystackFees`
- Supprimer la ligne "Frais transaction acompte (1%)"
- Supprimer le texte "Produits + frais de transaction (1%)"

#### 7. Textes à changer (rechercher "Paystack", "paystack", "frais de transaction")
- `src/components/driver/DriverDeliveriesSection.tsx` : Textes
- `src/components/shops/EditServiceDialog.tsx` : Textes
- `src/pages/Payments.tsx` : Section remboursements

### Edge functions à modifier

#### `supabase/functions/purchase-tokens/index.ts`
- Remplacer l'appel Paystack par Orange Money
- Utiliser `orange-money-payment` initialize ou dupliquer la logique
- Montants en unités entières (pas x100)

#### `supabase/functions/process-refund/index.ts`
- Orange Money n'a PAS d'API de remboursement
- Garder le tracking en base (statut `pending_manual`, `processed`)
- Remplacer l'appel Paystack par un simple changement de statut
- L'admin fera le remboursement manuellement (virement, etc.)

---

## 7. Edge function `orange-money-payment` — Référence

### Actions disponibles

#### `initialize` (requiert auth)
```json
{
  "action": "initialize",
  "amount": 5000,
  "email": "client@example.com",
  "payment_type": "order",
  "related_id": "uuid-de-la-commande",
  "metadata": { "is_advance": true },
  "return_url": "https://app.com/payment/callback",
  "cancel_url": "https://app.com/checkout"
}
```
Retourne : `{ success: true, payment_url, pay_token, order_id }`

#### `verify` (requiert auth)
```json
{
  "action": "verify",
  "order_id": "ORD-xxx",
  "pay_token": "token-xxx"
}
```
Retourne : `{ success: true, status: "SUCCESS"|"FAILED"|"PENDING", txnid, ... }`

#### `webhook` (pas d'auth, POST depuis Orange Money)
Orange Money envoie : `{ status, notif_token, txnid }`
Vérifie le `notif_token` et met à jour `payment_transactions`

---

## 8. Messagerie

### Tables
- `conversations(id, created_by, last_message_at)`
- `conversation_participants(conversation_id, user_id, is_muted, last_read_at)`
- `messages(conversation_id, sender_id, content, media_url, media_type, status)`

### Statuts de message
`sent` → `delivered` → `read`

### Fonctions SQL
- `is_conversation_participant(user_id, conversation_id)` → boolean
- `mark_messages_as_read(message_ids[])` : Marque comme lu

### Temps réel
Utilise Supabase Realtime pour les nouveaux messages et les mises à jour de statut.

---

## 9. Storage (Buckets Supabase)

| Bucket | Public | Usage |
|--------|--------|-------|
| avatars | ✅ | Photos de profil |
| shop-logos | ✅ | Logos boutiques |
| shop-banners | ✅ | Bannières boutiques |
| shop-stories | ✅ | Stories (expire 7j) |
| product-media | ✅ | Images/vidéos produits |
| service-media | ✅ | Images services |
| chat-media | ❌ | Pièces jointes messages |
| identity-documents | ❌ | Pièces d'identité |
| contracts | ❌ | Contrats |
| driver-licenses | ❌ | Permis de conduire |

---

## 10. Prompt Bolt.new — Migration Orange Money (Application Mobile)

### Pour l'app CLIENT (BOLT_CLIENT_APP.md) :

```
MIGRATION PAYSTACK → ORANGE MONEY

L'application utilise actuellement Paystack pour les paiements. Voici les changements à effectuer :

1. EDGE FUNCTION : Utiliser "orange-money-payment" au lieu de "paystack-payment"

2. INITIALISATION DU PAIEMENT :
   Avant (Paystack) :
   const { data } = await supabase.functions.invoke("paystack-payment", {
     body: { action: "initialize", amount, email, payment_type, related_id, callback_url }
   });
   window.location.href = data.authorization_url;

   Après (Orange Money) :
   const { data } = await supabase.functions.invoke("orange-money-payment", {
     body: {
       action: "initialize",
       amount,  // en FCFA entiers, PAS x100
       email,
       payment_type,
       related_id,
       metadata,
       return_url: "https://app.com/payment/callback",
       cancel_url: "https://app.com/checkout"
     }
   });
   // Stocker pour vérification au retour
   await AsyncStorage.setItem('om_order_id', data.order_id);
   await AsyncStorage.setItem('om_pay_token', data.pay_token);
   await AsyncStorage.setItem('om_payment_type', payment_type);
   // Ouvrir dans un WebView ou navigateur
   Linking.openURL(data.payment_url);
   // OU utiliser un WebView avec onNavigationStateChange pour détecter le retour

3. VÉRIFICATION DU PAIEMENT (au retour) :
   const orderId = await AsyncStorage.getItem('om_order_id');
   const payToken = await AsyncStorage.getItem('om_pay_token');
   const { data } = await supabase.functions.invoke("orange-money-payment", {
     body: { action: "verify", order_id: orderId, pay_token: payToken }
   });
   if (data.status === "SUCCESS") { /* Paiement réussi */ }

4. SUPPRESSION DES FRAIS 1% :
   Les frais Paystack de 1% n'existent plus avec Orange Money.
   advanceAmount = deliveryFee + deliveryCommission + productCommission  (SANS +1%)
   balanceAmount = subtotal  (SANS +1%)

5. ACHAT DE TOKENS :
   Utiliser "orange-money-payment" avec payment_type: "tokens" au lieu de "purchase-tokens"

6. REMBOURSEMENTS :
   Orange Money n'a PAS d'API de remboursement automatique.
   Les remboursements seront traités manuellement par l'admin.
   Afficher un message : "Votre demande de remboursement a été enregistrée. L'équipe vous contactera."

7. WEBVIEW APPROACH (React Native) :
   import { WebView } from 'react-native-webview';

   <WebView
     source={{ uri: paymentUrl }}
     onNavigationStateChange={(navState) => {
       if (navState.url.includes('payment/callback') || navState.url.includes('return_url')) {
         // Fermer le WebView et vérifier le paiement
         verifyPayment();
       }
       if (navState.url.includes('cancel_url')) {
         // Paiement annulé
         handleCancel();
       }
     }}
   />
```

### Pour l'app LIVREUR (BOLT_DRIVER_APP.md) :

```
MIGRATION PAYSTACK → ORANGE MONEY

Aucun changement majeur côté livreur. Le livreur ne fait pas de paiement.
Le seul changement est textuel : remplacer toute mention de "Paystack" par "Orange Money" dans l'interface.
Le paiement du solde par le client se fait toujours en ligne (Orange Money au lieu de Paystack).
```

---

## 11. Configuration Supabase

### Projet
- **URL** : `https://jajfuajmkjulujnwfqen.supabase.co`
- **Anon Key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphamZ1YWpta2p1bHVqbndmcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjY3MzUsImV4cCI6MjA3OTA0MjczNX0.ME5XNJsLbB0InLeKexBcIGe5sxZZsd6Jg2W9oB0IBEQ`

### Secrets actuels
- `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` → À remplacer par les secrets Orange Money
- `GOOGLE_MAPS_API_KEY` → Pour calculate-distance
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `SETUP_SECRET` → Pour setup-super-admin

### Secrets à ajouter pour Orange Money
- `ORANGE_MONEY_CLIENT_ID`
- `ORANGE_MONEY_CLIENT_SECRET`
- `ORANGE_MONEY_MERCHANT_KEY`
- `ORANGE_MONEY_AUTH_HEADER`

---

## 12. Commandes utiles

### Lancer le projet
```bash
npm install
npm run dev
```

### Structure d'un composant type
```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Utiliser les tokens CSS sémantiques de tailwind (bg-primary, text-foreground, etc.)
// NE PAS utiliser de couleurs directes (bg-red-500, text-white, etc.)
```

### Types Supabase
Le fichier `src/integrations/supabase/types.ts` est auto-généré et NE DOIT PAS être modifié manuellement.
