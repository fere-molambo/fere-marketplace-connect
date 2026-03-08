

# Corrections paiements/versements/remboursements

## Diagnostic

Après analyse du code et des triggers, voici l'état actuel vs les règles souhaitées :

### Commandes de produits — OK
1. **Livraison complète** → versement vendeur + livreur ✅ (trigger `sync_order_payment_from_transaction`)
2. **Annulation avant pickup** → remboursement client ✅ (`RequestCancellationDialog` crée un `refunds`)
3. **Annulation après pickup (arrived)** → versement livreur, pas de remboursement ✅ (`RequestCancellationDialog`)

### Prestations de service — 1 problème trouvé
1. **Prestation effectuée (100% ou 50%)** → versement vendeur = `(total_price - commission) + travel_fee` ✅
2. **Annulation avant déplacement** → remboursement acompte si payé ✅ (`handleCancelBeforeOnTheWay`)
3. **Annulation après arrivée** → **BUG** : le trigger `handle_service_booking_payout` crée un versement vendeur de `travel_fee` pour `cancelled_at_arrival`. L'utilisateur dit qu'**aucun versement ne doit être créé pour le vendeur** dans ce cas.

### RefundsSection — Affichage incomplet
Le composant `RefundsSection` ne joint que `orders(order_number)` mais pas `service_bookings`. Les remboursements de prestations affichent "Commande" au lieu du nom du service.

## Plan de correction

### 1. Migration SQL : supprimer le versement vendeur pour `cancelled_at_arrival`
Mettre à jour `handle_service_booking_payout` pour retirer le bloc `cancelled_at_arrival` qui crée un payout vendeur. Le vendeur ne reçoit rien si le client annule à l'arrivée.

### 2. Corriger `RefundsSection` pour afficher les remboursements de prestations
Modifier la query pour joindre aussi `booking:service_bookings(id, service:services(name))` et afficher le nom du service au lieu de "Commande".

### 3. Prompt mobile pour Bolt.new
Fournir au user un prompt pour que l'app mobile :
- Affiche les remboursements du client (table `refunds` filtrée par `user_id`)
- Affiche les versements pour vendeurs/livreurs (table `pending_payouts` filtrée par `recipient_id`)

## Fichiers modifiés
- **Migration SQL** : suppression du bloc `cancelled_at_arrival` dans `handle_service_booking_payout`
- **`src/components/client/RefundsSection.tsx`** : ajout jointure service_bookings + affichage nom service

