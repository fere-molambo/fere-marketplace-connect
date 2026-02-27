
# Nettoyage des donnees de test

## Etat actuel
- **4 service_bookings** : 3 en statut `pending`, 1 en statut `cancelled`
- **0 pending_payouts** : rien a supprimer

## Actions
1. Supprimer les 4 enregistrements de `service_bookings` (les IDs : `f16acb1d`, `79e8cf24`, `169cea0a`, `4f164052`)
2. Verifier s'il existe des `payment_transactions` ou `pending_payments` liees a ces bookings et les nettoyer aussi
3. Verifier s'il existe des `cancellations` liees a ces bookings

## Details techniques
- Suppression via des requetes `DELETE` sur la table `service_bookings`
- Nettoyage en cascade des tables liees (`pending_payments`, `payment_transactions`, `cancellations`) si des enregistrements existent
