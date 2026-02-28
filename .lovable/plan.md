

# Plan : Table de preferences de notifications + Prompt Bolt.new unifie

## 1. Migration SQL — Table `notification_preferences`

Creer une table pour stocker les preferences de notification par utilisateur, avec des colonnes booleennes par type de notification selon le role.

**Table `notification_preferences`** :
- `id` uuid PK
- `user_id` uuid (ref auth.users, unique)
- **Notifications Membre (client)** :
  - `order_status_updates` boolean default true — Mises a jour statut commande
  - `delivery_tracking` boolean default true — Suivi livraison en temps reel
  - `promotions` boolean default true — Promos et ventes flash
  - `messages` boolean default true — Nouveaux messages
  - `booking_reminders` boolean default true — Rappels de reservations
- **Notifications Vendeur/Equipe** :
  - `new_orders` boolean default true — Nouvelles commandes
  - `order_cancellations` boolean default true — Annulations
  - `new_reviews` boolean default true — Nouveaux avis
  - `low_stock` boolean default true — Stock bas (futur)
  - `new_bookings` boolean default true — Nouvelles reservations
- **Notifications Livreur** :
  - `new_delivery_available` boolean default true — Nouvelle livraison dispo
  - `delivery_status_changes` boolean default true — Changements statut livraison
  - `payout_updates` boolean default true — Versements
- `created_at`, `updated_at`
- RLS : chaque utilisateur gere ses propres preferences
- Trigger `update_updated_at_column`

## 2. Prompt Bolt.new unifie

Generer un prompt unique et optimise pour une seule app React Native/Expo avec vues par role, integrant :
- Notifications push avec preferences granulaires
- Carte de suivi temps reel (OSM + OSRM)
- Gestion equipe vendeur

Le prompt sera affiche directement dans la reponse (pas de fichier).

### Fichiers modifies/crees
| Fichier | Action |
|---------|--------|
| Migration SQL | Table `notification_preferences` + RLS |
| Reponse chat | Prompt Bolt.new complet |

