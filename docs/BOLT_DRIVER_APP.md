# Instructions Bolt.new — Application Livreur Fere

> Ce document contient toutes les instructions pour créer l'application mobile des livreurs avec Bolt.new, connectée au backend Supabase existant.

---

## 🔗 Connexion Supabase

```typescript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jajfuajmkjulujnwfqen.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphamZ1YWpta2p1bHVqbndmcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjY3MzUsImV4cCI6MjA3OTA0MjczNX0.ME5XNJsLbB0InLeKexBcIGe5sxZZsd6Jg2W9oB0IBEQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## 🔐 Authentification

Le livreur se connecte avec email + mot de passe. Son compte est créé par l'admin sur le dashboard web. Le livreur a le rôle `livreur`.

### Connexion

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "livreur@example.com",
  password: "motdepasse",
});
// data.session contient le token JWT
// data.user contient les infos utilisateur
```

### Vérifier le rôle

```typescript
const { data: roles } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", userId);

const isDriver = roles?.some((r) => r.role === "livreur");
```

### Récupérer le profil

```typescript
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single();
```

### Déconnexion

```typescript
await supabase.auth.signOut();
```

---

## 📱 Écrans de l'application

### 1. Dashboard Livreur

#### Toggle Disponibilité

```typescript
await supabase
  .from("profiles")
  .update({ is_available: true }) // ou false
  .eq("id", userId);
```

#### Mise à jour GPS en temps réel

Envoyer la position toutes les 10-15 secondes quand le livreur est disponible ou en livraison :

```typescript
await supabase
  .from("profiles")
  .update({
    current_lat: latitude,
    current_lng: longitude,
    last_location_update: new Date().toISOString(),
  })
  .eq("id", userId);
```

---

### 2. Livraisons disponibles

Le livreur voit les livraisons en attente dans ses zones actives.

#### Récupérer les zones du livreur

```typescript
const { data: driverZones } = await supabase
  .from("driver_zones")
  .select("zone_id")
  .eq("driver_id", userId)
  .eq("is_active", true);

const zoneIds = driverZones?.map((z) => z.zone_id) || [];
```

#### Récupérer les livraisons disponibles

```typescript
const { data: pending } = await supabase
  .from("delivery_requests")
  .select("*, delivery_zones(name, city)")
  .eq("status", "pending")
  .or(`zone_id.in.(${zoneIds.join(",")}),zone_id.is.null`)
  .order("created_at", { ascending: false });
```

Chaque livraison contient :
- `pickup_point` (jsonb) : `{ shop_name, lat, lng, address }`
- `delivery_point` (jsonb) : `{ address, lat, lng, recipient_name, recipient_phone }`
- `driver_earnings` : montant que le livreur gagnera (en FCFA)
- `delivery_fee` : frais de livraison total
- `total_distance_meters` : distance estimée

#### Accepter une livraison

```typescript
const { error } = await supabase
  .from("delivery_requests")
  .update({
    driver_id: userId,
    status: "assigned",
    assigned_at: new Date().toISOString(),
  })
  .eq("id", requestId)
  .eq("status", "pending"); // Protection concurrence
```

**Important** : le `.eq("status", "pending")` empêche deux livreurs d'accepter la même livraison.

---

### 3. Livraison active — Flux 7 étapes

```
┌─────────┐    ┌──────────┐    ┌─────────────┐    ┌───────────┐
│ pending  │───▶│ assigned  │───▶│ in_progress │───▶│ picked_up │
└─────────┘    └──────────┘    └─────────────┘    └───────────┘
                                                        │
                                                        ▼
              ┌───────────┐    ┌─────────┐    ┌─────────────────┐
              │ delivered  │◀───│ arrived │◀───│ en_route_client │
              └───────────┘    └─────────┘    └─────────────────┘
```

| Étape | Status | Action livreur | Champ timestamp |
|-------|--------|---------------|-----------------|
| 1 | `pending` | — | `created_at` |
| 2 | `assigned` | Accepter | `assigned_at` |
| 3 | `in_progress` | Démarrer vers vendeur | `started_at` |
| 4 | `picked_up` | Colis récupéré | `picked_up_at` |
| 5 | `en_route_client` | En route vers client | `en_route_client_at` |
| 6 | `arrived` | Arrivé chez client | `arrived_at_client_at` |
| 7 | `delivered` | **AUTOMATIQUE** (client paie le solde) | `delivered_at` |

#### Mettre à jour le statut (étapes 3 à 6)

```typescript
const updates: Record<string, any> = { status: newStatus };

if (newStatus === "in_progress") updates.started_at = new Date().toISOString();
if (newStatus === "picked_up") updates.picked_up_at = new Date().toISOString();
if (newStatus === "en_route_client") updates.en_route_client_at = new Date().toISOString();
if (newStatus === "arrived") updates.arrived_at_client_at = new Date().toISOString();

const { error } = await supabase
  .from("delivery_requests")
  .update(updates)
  .eq("id", requestId)
  .eq("driver_id", userId);
```

#### ⚠️ Le livreur NE marque PAS "delivered"

À l'étape `arrived` :
- Le livreur attend que le client vérifie le colis
- Le **client** paie le solde via Paystack
- Le système marque automatiquement la livraison comme `delivered` via un trigger DB (`sync_order_payment_from_transaction`)
- Le livreur voit la mise à jour en temps réel via la subscription realtime

#### Affichage selon l'étape

| Status | Texte livreur | Action disponible |
|--------|--------------|-------------------|
| `assigned` | "Livraison acceptée" | Bouton "Démarrer vers vendeur" |
| `in_progress` | "En route vers le vendeur" | Navigation GPS + Bouton "Colis récupéré" |
| `picked_up` | "Colis récupéré" | Bouton "En route vers client" |
| `en_route_client` | "En route vers le client" | Navigation GPS + Bouton "Arrivé chez client" |
| `arrived` | "En attente du client" | Message d'attente (aucun bouton) |
| `delivered` | "Livraison terminée ✅" | Résumé des gains |

---

### 4. Flux de retour (commande annulée après pickup)

Quand le client annule **après** le pickup, le système crée une **nouvelle livraison de retour** (`is_return: true`).

```
┌───────────────────┐    ┌─────────────────┐    ┌──────────┐
│ en_route_vendor   │───▶│ arrived_vendor  │───▶│ returned │
│ (status=in_progress)│   │ (status=arrived) │    │(status=delivered)│
└───────────────────┘    └─────────────────┘    └──────────┘
```

**Mapping technique** (contournement des contraintes CHECK) :

| Étape retour | `status` (colonne DB) | `return_status` (colonne DB) |
|-------------|----------------------|------------------------------|
| En route vendeur | `in_progress` | `en_route_vendor` |
| Arrivé vendeur | `arrived` | `arrived_vendor` |
| Retourné | `delivered` | `returned` |

#### Identifier une livraison retour

```typescript
// Dans la liste des livraisons actives
const { data: myDeliveries } = await supabase
  .from("delivery_requests")
  .select("*, order:orders!order_id(order_number)")
  .eq("driver_id", userId)
  .neq("status", "pending")
  .neq("status", "delivered")
  .neq("status", "cancelled");

// Filtrer : isReturn = delivery.is_return === true
```

#### Mettre à jour le statut retour

```typescript
// Étape : Arrivé chez le vendeur
const { error } = await supabase
  .from("delivery_requests")
  .update({
    status: "arrived",
    return_status: "arrived_vendor",
    arrived_at_client_at: new Date().toISOString(),
  })
  .eq("id", requestId)
  .eq("driver_id", userId);
```

**Important** : Le livreur ne peut PAS marquer le retour comme "retourné". C'est le **vendeur** qui confirme la réception sur le dashboard web. Le livreur attend la confirmation.

#### UI pour les retours

| `return_status` | Badge | Action livreur |
|-----------------|-------|---------------|
| `en_route_vendor` | 🔄 Retour en cours | Bouton "Arrivé chez vendeur" |
| `arrived_vendor` | ⏳ Attente vendeur | Message "En attente de confirmation du vendeur" |
| `returned` | ✅ Retourné | Retour terminé |

---

### 5. Annulation par le livreur

Le livreur peut annuler **avant** d'avoir récupéré le colis (statuts `assigned` ou `in_progress`).

```typescript
// 1. Récupérer les motifs d'annulation
const { data: reasons } = await supabase
  .from("cancellation_reasons")
  .select("id, label")
  .eq("is_active", true)
  .contains("applies_to", ["livreur"]);

// 2. Créer l'annulation
const { error } = await supabase.from("cancellations").insert({
  order_id: delivery.order_id,
  cancelled_by: userId,
  canceller_role: "driver",
  reason_id: selectedReasonId, // ou null si motif personnalisé
  custom_reason: customReasonText, // si motif libre
  status_at_cancellation: delivery.status,
  requires_return: false, // pas de retour car pas encore ramassé
});

// 3. Mettre à jour la livraison
await supabase
  .from("delivery_requests")
  .update({ status: "cancelled" })
  .eq("id", delivery.id)
  .eq("driver_id", userId);
```

---

### 6. Historique des livraisons

```typescript
const { data: history } = await supabase
  .from("delivery_requests")
  .select(`
    *,
    delivery_zones(name, city),
    order:orders!order_id(order_number)
  `)
  .eq("driver_id", userId)
  .in("status", ["delivered", "cancelled"])
  .order("created_at", { ascending: false })
  .limit(50);
```

#### Calcul des gains du jour

```typescript
const today = new Date().toDateString();
const todayEarnings = history
  .filter((d) => {
    const date = new Date(d.delivered_at || d.created_at).toDateString();
    return date === today && !d.is_return && d.status === "delivered";
  })
  .reduce((sum, d) => sum + (d.driver_earnings || 0), 0);
```

**Règle importante** : Les livraisons retour (`is_return: true`) ne génèrent PAS de gains supplémentaires.

---

### 7. Tokens

Les tokens sont la monnaie de la plateforme. Les livreurs en ont besoin pour payer les commissions.

#### Consulter le solde

```typescript
const { data: tokens } = await supabase
  .from("user_tokens")
  .select("balance")
  .eq("user_id", userId)
  .single();
```

#### Historique des transactions

```typescript
const { data: transactions } = await supabase
  .from("token_transactions")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(30);
```

#### Acheter des tokens

```typescript
const { data, error } = await supabase.functions.invoke("purchase-tokens", {
  body: {
    user_id: userId,
    email: userEmail,
    amount: 10000, // montant en FCFA
    callback_url: "https://votre-app.com/payment/callback",
  },
});

// data.authorization_url → rediriger vers cette URL pour le paiement Paystack
// Après paiement, Paystack redirige vers callback_url avec ?reference=XXX
```

#### Vérifier le paiement des tokens (après retour du callback)

```typescript
const { data } = await supabase.functions.invoke("paystack-payment", {
  body: {
    action: "verify",
    reference: referenceFromUrl,
  },
});

if (data.status === "success") {
  // Les tokens sont automatiquement ajoutés via le trigger DB
  // Recharger le solde
}
```

---

## 🔄 Subscriptions Realtime

### Écouter les mises à jour de livraison

```typescript
const channel = supabase
  .channel("driver-deliveries")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "delivery_requests",
    },
    (payload) => {
      // Rafraîchir les données
      if (payload.eventType === "INSERT") {
        // Nouvelle livraison disponible
      }
      if (payload.eventType === "UPDATE") {
        const delivery = payload.new;
        if (delivery.driver_id === userId) {
          if (delivery.status === "delivered") {
            // Notification : "Livraison terminée ! Le client a payé."
          } else if (delivery.status === "cancelled") {
            // Notification : "Commande annulée. Retour à initier."
          }
        }
      }
    }
  )
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

---

## 📋 Tables utilisées par le livreur

| Table | Usage |
|-------|-------|
| `profiles` | Profil, position GPS, disponibilité |
| `user_roles` | Vérifier le rôle `livreur` |
| `delivery_requests` | Livraisons (disponibles, actives, historique) |
| `delivery_zones` | Zones géographiques |
| `driver_zones` | Zones assignées au livreur |
| `cancellation_reasons` | Motifs d'annulation |
| `cancellations` | Enregistrer les annulations |
| `user_tokens` | Solde de tokens |
| `token_transactions` | Historique tokens |
| `orders` | Infos commande (numéro, statut paiement) |
| `pending_payouts` | Suivi des versements |

---

## 🎨 UI/UX Recommandations

1. **Écran principal** : carte avec position GPS + toggle disponibilité
2. **Liste livraisons** : afficher distance + gains + nom de la boutique
3. **Livraison active** : boutons gros et clairs pour chaque étape
4. **Badge retour** : utiliser une couleur différente (ambre) pour les retours
5. **Gains** : afficher le total du jour en haut de l'historique
6. **Notifications push** : notification quand une nouvelle livraison est disponible dans la zone
7. **Navigation** : ouvrir l'app de navigation (Google Maps / Waze) avec les coordonnées

---

## ⚠️ Règles métier critiques

1. **Pas de bouton "Livré"** : Le livreur ne marque JAMAIS une livraison comme terminée. C'est le paiement client qui déclenche ça automatiquement.
2. **Concurrence** : Quand le livreur accepte, vérifier `eq("status", "pending")` pour éviter les doublons.
3. **Retours sans gains** : Les livraisons de retour (`is_return: true`) ne doivent pas montrer de gains ni être comptées dans les totaux.
4. **Vendeur confirme le retour** : Le livreur ne peut pas finaliser un retour. Il attend la confirmation vendeur.
5. **GPS continu** : Mettre à jour la position toutes les 10-15 secondes quand le livreur est en service.
