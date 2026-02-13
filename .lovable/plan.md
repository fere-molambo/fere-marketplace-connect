

# Plan : Nettoyage complet des donnees de test

Suppression de toutes les donnees transactionnelles pour repartir de zero, en preservant les utilisateurs, boutiques, produits et configurations.

## Tables a vider (dans l'ordre pour respecter les contraintes)

1. `pending_payouts` - versements en attente
2. `refunds` - remboursements
3. `client_penalties` - penalites (ancien systeme)
4. `cancellations` - annulations
5. `delivery_requests` - demandes de livraison
6. `order_items` - articles des commandes
7. `orders` - commandes
8. `service_bookings` - reservations de services
9. `payment_transactions` - transactions de paiement

## Ce qui est preserve

- Profils utilisateurs et roles
- Boutiques, produits, services
- Zones de livraison
- Adresses de livraison
- Configuration plateforme
- Categories, FAQ, conversations

## Methode

Une seule requete SQL executee via l'outil de migration (DELETE statements dans le bon ordre).

