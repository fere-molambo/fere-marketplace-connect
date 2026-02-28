

# Plan : Infrastructure backend pour les fonctionnalites mobile

## 3 actions a realiser dans Lovable

### 1. Migration SQL — Creer 2 tables + realtime

**Table `device_tokens`** : stockage des push tokens Expo/FCM
- `id`, `user_id` (ref auth.users), `token`, `platform` (ios/android/web), `is_active`, timestamps
- Contrainte unique `(user_id, token)`
- RLS : chaque utilisateur gere ses propres tokens

**Table `live_tracking_sessions`** : positions GPS temps reel
- `id`, `tracker_id` (ref auth.users), `tracker_role` (driver/vendor/team), `reference_type` (delivery_request/service_booking), `reference_id`, `current_lat`, `current_lng`, `heading`, `speed`, `is_active`, timestamps
- RLS : le tracker update ses sessions ; les parties concernees (client via orders/bookings, vendeur via shops) peuvent lire
- Ajout a `supabase_realtime` publication

### 2. Edge function `send-notification`

- Recoit `{ user_ids, title, body, data }` (authentifie, JWT requis)
- Recupere les tokens actifs depuis `device_tokens`
- Envoie via **Expo Push API** (`https://exp.host/--/api/v2/push/send`) — gratuit, pas de secret requis
- Retourne le resultat d'envoi

### 3. Mise a jour `supabase/config.toml`

Ajouter :
```toml
[functions.send-notification]
verify_jwt = true
```

### Fichiers crees/modifies

| Fichier | Action |
|---------|--------|
| Migration SQL | 2 tables + RLS + realtime |
| `supabase/functions/send-notification/index.ts` | Nouvelle edge function |
| `supabase/config.toml` | Ajouter send-notification |

