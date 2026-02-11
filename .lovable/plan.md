

# Nettoyage complet des donnees de test

Suppression de toutes les donnees liees aux commandes, livraisons et annulations pour repartir a zero.

## Ordre de suppression (respect des dependances)

1. `cancellations` - annulations
2. `client_penalties` - penalites client
3. `pending_payouts` - paiements en attente
4. `delivery_requests` - demandes de livraison
5. `order_items` - articles des commandes
6. `payment_transactions` (type order uniquement) - transactions de paiement
7. `orders` - commandes

## Details techniques

Les suppressions doivent se faire dans cet ordre precis car les tables ont des references entre elles (foreign keys). Chaque table sera videe via une requete `DELETE` sans condition (sauf `payment_transactions` ou on ne supprime que les transactions de type `order` pour preserver les achats de tokens).

