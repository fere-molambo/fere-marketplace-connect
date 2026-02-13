

# Plan : Nouveau systeme de paiement en deux temps (Acompte + Solde)

## Resume du nouveau flux

Le client paie en **deux etapes** via Paystack :
1. **Acompte** (a la commande) : frais de livraison + commission livraison + commission produit
2. **Solde** (quand le livreur arrive) : montant produit + frais Paystack

Pas de cash. Pas de tokens. Annulation simplifiee.

## Regles d'annulation

| Moment | Action |
|--------|--------|
| Avant "colis recupere" | Client annule librement. Admin rembourse l'acompte integralement |
| Livreur arrive chez client | Client choisit "Verifier et payer" OU "Annuler" |
| Client verifie et paie le solde | Commande livree. Aucune annulation possible |
| Client annule a l'arrivee | Pas de solde paye. L'acompte sert a payer le livreur (frais livraison + commission produit). La plateforme conserve la commission livraison. Retour du colis initie |
| Apres paiement du solde | Aucune annulation possible |

## Ce qui est supprime

- Paiement cash (plus de choix cash/online)
- Systeme de tokens (vendeur et livreur)
- Systeme de penalites client
- Logique d'annulation complexe du livreur

## Modifications par fichier

### 1. Migration SQL : `fix_advance_payment_system.sql`

- Ajouter colonne `advance_amount` a la table `orders` (montant de l'acompte : delivery_fee + delivery_commission + product_commission)
- Ajouter colonne `balance_amount` a la table `orders` (solde a payer : subtotal + frais Paystack)
- Ajouter colonne `balance_payment_reference` a la table `orders` (reference du 2e paiement)
- Ajouter colonne `balance_payment_status` a la table `orders` (pending/paid)
- Supprimer les contraintes liees aux tokens dans les triggers existants
- Modifier `handle_delivery_completed` : ne plus deduire de tokens, juste creer les pending_payouts pour vendeur et livreur
- Modifier `sync_order_payment_from_transaction` : gerer les deux types de paiement (acompte et solde)
- Corriger les donnees existantes si necessaire

### 2. `src/pages/Checkout.tsx` -- Refonte du checkout

- Supprimer le choix de mode de paiement (plus de `PaymentMethodSelector`)
- Supprimer la logique des penalites client
- Calculer l'acompte : `delivery_fee + delivery_commission_fere + product_commission`
- Calculer le solde : `subtotal` (montant produit)
- Afficher les deux montants clairement dans le recapitulatif
- Le bouton "Payer l'acompte" initialise un paiement Paystack pour le montant de l'acompte uniquement
- Stocker `advance_amount`, `balance_amount`, `payment_method: "advance"` dans la commande

### 3. `src/components/checkout/PaymentMethodSelector.tsx` -- A supprimer ou simplifier

- Supprimer le composant ou le remplacer par un affichage informatif du systeme en 2 temps

### 4. `src/components/checkout/OrdersByVendorSummary.tsx` -- Adapter le recapitulatif

- Afficher : sous-total produit, frais de livraison, commission livraison, commission produit
- Ligne "Acompte a payer maintenant" en gras
- Ligne "Solde a payer a la livraison" en info

### 5. `src/components/driver/DriverCancellationDialog.tsx` -- Simplifier radicalement

- Supprimer les branches cash
- Supprimer les references aux tokens et penalites
- A l'arrivee du livreur, le dialog n'est plus necessaire cote livreur pour l'annulation. Le livreur attend simplement que le client agisse
- Garder juste un bouton pour signaler un probleme (optionnel)

### 6. `src/components/orders/ClientOrderDetailSheet.tsx` -- Ajouter le paiement du solde

- Quand `delivery.status === "arrived"` : afficher deux boutons :
  - **"Colis verifie, payer le solde"** : initialise un paiement Paystack pour `balance_amount`, puis marque la commande comme livree
  - **"Annuler la commande"** : annule la commande, initie le retour du colis
- Quand `delivery.status` est avant `picked_up` : garder le bouton "Annuler" classique
- Apres que le client a paye le solde : plus aucune action possible

### 7. `src/components/driver/DriverDeliveriesSection.tsx` -- Adapter l'interface livreur

- Au statut `arrived` : remplacer le dialog actuel par un message "En attente de verification par le client"
- Le livreur ne fait plus l'action de confirmer la livraison. C'est le paiement du solde par le client qui declenche le passage a "delivered"
- Garder l'historique enrichi (gains, statut paiement, details annulation)

### 8. `src/components/shops/VendorTokensSection.tsx` et `src/components/driver/DriverTokensSection.tsx` -- A supprimer

- Retirer les sections tokens du dashboard vendeur et livreur
- Retirer les liens dans le sidebar/navigation si presents

### 9. `src/components/tokens/` -- Desactiver le systeme de tokens

- `BuyTokensDialog.tsx`, `TokenBalanceCard.tsx`, `TokenHistoryTable.tsx` : ne plus les afficher (ou les supprimer)
- Les tables DB `user_tokens` et `token_transactions` restent en base mais ne sont plus utilisees

### 10. `src/pages/Payments.tsx` -- Adapter le dashboard admin

- Les versements vendeurs et livreurs restent dans "En attente" / "Effectues"
- Les remboursements restent dans l'onglet "Remboursements" pour les acomptes a rembourser
- Ajouter la distinction : remboursement total (annulation avant pickup) vs partiel (annulation a l'arrivee, acompte redistribue au livreur)

### 11. Triggers DB -- Workflow de paiement du solde

- Quand le client paie le solde (payment_transaction type "order_balance" passe a success) :
  - Mettre `orders.balance_payment_status = 'paid'`
  - Mettre `orders.payment_status = 'paid'` (paiement complet)
  - Mettre `delivery_requests.status = 'delivered'`
  - Creer les `pending_payouts` pour vendeur (subtotal - commission) et livreur (driver_earnings)

### 12. Edge Function `paystack-payment` -- Adapter pour le solde

- Supporter un nouveau `payment_type: "order_balance"` pour le deuxieme paiement
- Le callback verifie et met a jour `balance_payment_status`

## Flux detaille

```text
CLIENT                          LIVREUR                    ADMIN
  |                                |                         |
  |-- Commande + paie acompte --->|                         |
  |   (Paystack)                   |                         |
  |                                |                         |
  |   [Peut annuler]               |-- Accepte livraison     |
  |   avant pickup                 |-- En route vendeur      |
  |                                |-- Colis recupere ------>|
  |   [Ne peut plus annuler        |                         |
  |    de lui-meme]                |-- En route client       |
  |                                |-- Arrive chez client    |
  |                                |                         |
  |<-- Notif "livreur arrive" -----|                         |
  |                                |                         |
  |-- Option A: Payer solde ------>| --> Livraison terminee  |
  |   (Paystack)                   |                         |
  |                                |     Cree pending_payouts|
  |                                |     vendeur + livreur   |
  |                                |                         |
  |-- Option B: Annuler ---------->| --> Retour colis initie |
  |   (pas de solde)               |                         |
  |                                |     Acompte redistribue:|
  |                                |     - livreur: frais +  |
  |                                |       comm produit      |
  |                                |     - plateforme: comm  |
  |                                |       livraison         |
```

## Impact

- ~12 fichiers modifies/crees
- 1 migration SQL significative
- 1 modification Edge Function
- Suppression nette de complexite (tokens, cash, penalites)
- Prepare le terrain pour les apps mobiles (flux clair et previsible)

