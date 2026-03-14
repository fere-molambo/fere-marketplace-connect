

# Nettoyage des vendeurs (sauf boutiques admin)

## Analyse de la situation

**13 boutiques** au total :
- **11 boutiques à conserver** : propriété du super_admin ou créées par lui (Audio Vision, ElectroHome, Services Pro Bamako, BazarMix, BTP Solutions, GameZone Mali, Artisans Express, Smartthings, WoGymFit, TechMali Store, Run Shop test, Vi shop)
- **1 boutique à supprimer** : "Fashion consulting" (créée par le vendeur 586c3679)

**6 vendeurs** au total :
- **2 à conserver** (propriétaires de boutiques créées par admin) : fo-part 001, prest part 001
- **4 à supprimer** (pas de boutique admin) : vendeur 003, vendeur004, vendeur complet, vendeur001

## Plan d'exécution

Migration SQL qui, dans l'ordre des dépendances :

1. **Supprimer les données de la boutique "Fashion consulting"** (`f944559d`) :
   - flash_sales, shop_stories, shop_reviews, shop_team_members, generated_images
   - products et services de cette boutique
   - La boutique elle-même

2. **Supprimer les données des 4 vendeurs** (`586c3679`, `95ec18c8`, `a3669fbd`, `ee3642fc`) :
   - pending_payouts, refunds, client_penalties, token_transactions, user_tokens
   - favorites, notification_preferences, device_tokens, delivery_addresses
   - conversation_participants, messages
   - order_items, payment_transactions, orders (liés à ces users)
   - service_bookings
   - user_roles, profiles

3. **Supprimer les comptes auth** via l'Edge Function `delete-user` (ou manuellement depuis le dashboard Supabase Auth)

> Les 2 vendeurs conservés (fo-part 001, prest part 001) et leurs boutiques admin restent intacts.

## Section technique

```sql
-- IDs vendeurs à supprimer
-- 586c3679-f0d8-4bf2-b6f4-26938cd057f8 (vendeur 003)
-- 95ec18c8-8e0b-4a27-b457-6f808ac64165 (vendeur004)
-- a3669fbd-162a-439c-bb05-b6d2fb102287 (vendeur complet)
-- ee3642fc-c882-488a-acda-271e9f1219ff (vendeur001)

-- Boutique à supprimer: f944559d-a6f2-4f12-b861-bae5c7c8d30a
```

La suppression des comptes auth devra être faite via le dashboard Supabase (Auth > Users) car les migrations SQL ne peuvent pas toucher le schéma `auth`.

