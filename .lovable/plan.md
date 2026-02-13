

# Plan : Ajouter les frais Paystack (1%) au solde client

## Contexte

Actuellement, le solde (balance) que le client paie a la livraison est exactement le prix des produits (ex: 3 000 FCFA). Le client devrait aussi supporter les frais de transaction Paystack de 1%, soit un solde de 3 030 FCFA dans cet exemple.

Le vendeur recoit bien 2 700 FCFA (3 000 - 10% commission plateforme), ce qui est correct. Le probleme est uniquement que les frais Paystack ne sont pas repercutes sur le client.

## Modifications

### 1. `src/pages/Checkout.tsx`

- Ajouter le calcul des frais Paystack (1%) sur le montant des produits
- Le nouveau `balanceAmount` = subtotal + frais Paystack (1% du subtotal)
- Stocker `balance_amount` avec les frais inclus dans la commande
- Afficher les frais dans le recapitulatif

### 2. `src/components/checkout/OrdersByVendorSummary.tsx`

- Ajouter une prop `paystackFees` pour afficher la ligne de frais Paystack
- Afficher "Frais de transaction (1%)" entre le sous-total produits et le solde

### 3. `src/components/orders/ClientOrderDetailSheet.tsx`

- Le `balanceAmount` est deja lu depuis `order.balance_amount`, donc il inclura automatiquement les frais une fois stocke correctement

### 4. `supabase/functions/paystack-payment/index.ts` (securite serveur)

- Pour les paiements de type `order_balance`, recalculer le montant attendu cote serveur en recuperant le `balance_amount` de la commande dans la base de donnees, au lieu de faire confiance au montant envoye par le client

## Detail technique

```text
Calcul actuel :
  Solde = subtotal (3 000)

Nouveau calcul :
  Frais Paystack = Math.ceil(subtotal * 0.01)  // 30
  Solde = subtotal + frais Paystack             // 3 030

Stockage en base :
  orders.balance_amount = subtotal + frais Paystack
  orders.subtotal = inchange (prix produits brut)

Versement vendeur (inchange) :
  subtotal - commission = 3 000 - 300 = 2 700
```

La meme logique de frais 1% sera aussi appliquee au paiement de l'acompte (advance), car les deux passent par Paystack.
