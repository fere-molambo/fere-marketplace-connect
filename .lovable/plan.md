

# 1. Nettoyage base de donnees + 2. Prompt livraison mobile

## Partie 1 : Nettoyage des donnees transactionnelles

Donnees actuelles a supprimer :
- 13 commandes (orders)
- 14 articles (order_items)
- 10 livraisons (delivery_requests)
- 3 annulations (cancellations)
- 1 remboursement (refunds)
- 6 versements (pending_payouts)
- 13 transactions de paiement (payment_transactions)

Les tokens et achats de tokens seront preserves.

### Sequence SQL (ordre important pour les FK)

```sql
-- 1. Nullifier les references circulaires
UPDATE orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;

-- 2. Supprimer dans l'ordre des dependances
DELETE FROM pending_payouts;
DELETE FROM refunds;
DELETE FROM client_penalties;
DELETE FROM cancellations;
DELETE FROM order_items;
DELETE FROM delivery_requests;
DELETE FROM payment_transactions WHERE payment_type IN ('order', 'order_advance', 'order_balance');
DELETE FROM orders;
```

Les donnees preservees : profiles, shops, products, services, user_tokens, token_transactions (achats).

---

## Partie 2 : Prompt pour Bolt.new — Suivi livraison mobile livreur

Voici le prompt pret a copier dans Bolt.new. Il reprend exactement la logique implementee dans le dashboard web.

---

### PROMPT A COPIER :

---

**Integre le systeme de suivi de livraisons pour le livreur. Voici les specs completes :**

#### Connexion Supabase

```typescript
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://jajfuajmkjulujnwfqen.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphamZ1YWpta2p1bHVqbndmcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjY3MzUsImV4cCI6MjA3OTA0MjczNX0.ME5XNJsLbB0InLeKexBcIGe5sxZZsd6Jg2W9oB0IBEQ"
);
```

#### 1. Livraisons disponibles

Le livreur voit les livraisons en attente dans ses zones actives.

```typescript
// Recuperer les zones du livreur
const { data: driverZones } = await supabase
  .from("driver_zones")
  .select("zone_id")
  .eq("driver_id", userId)
  .eq("is_active", true);
const zoneIds = driverZones?.map(z => z.zone_id) || [];

// Recuperer les livraisons disponibles
const { data: pending } = await supabase
  .from("delivery_requests")
  .select("*, delivery_zones(name, city)")
  .eq("status", "pending")
  .or(`zone_id.in.(${zoneIds.join(",")}),zone_id.is.null`)
  .order("created_at", { ascending: false });
```

Chaque livraison contient :
- `pickup_points` (jsonb array) : `[{ shop_name, lat, lng, address }]` — points de collecte
- `delivery_point` (jsonb) : `{ address, lat, lng, recipient_name, recipient_phone }` — point de livraison
- `driver_earnings` : gains du livreur en FCFA
- `delivery_fee` : frais de livraison total
- `total_distance_meters` : distance estimee

Affiche pour chaque livraison disponible : la zone, la distance (km), les gains, les points de collecte et le point de livraison. Bouton "Accepter cette livraison".

#### 2. Accepter une livraison

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

Le `.eq("status", "pending")` empeche deux livreurs d'accepter la meme livraison.

#### 3. Livraison active — Flux 7 etapes

```
pending -> assigned -> in_progress -> picked_up -> en_route_client -> arrived -> delivered
```

Le livreur avance le statut de l'etape 2 (assigned) a l'etape 6 (arrived). L'etape 7 (delivered) est AUTOMATIQUE quand le client paie le solde.

| Etape | Status | Action livreur | Timestamp |
|-------|--------|---------------|-----------|
| 2 | assigned | Bouton "Demarrer vers vendeur" | assigned_at |
| 3 | in_progress | Bouton "Colis recupere" + Navigation GPS | started_at |
| 4 | picked_up | Bouton "En route vers client" | picked_up_at |
| 5 | en_route_client | Bouton "Arrive chez client" + Navigation GPS | en_route_client_at |
| 6 | arrived | AUCUN bouton — Message "En attente du client" | arrived_at_client_at |
| 7 | delivered | AUTOMATIQUE — "Livraison terminee" | delivered_at |

Mise a jour du statut :

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

**CRITIQUE : Le livreur ne marque JAMAIS "delivered".** A l'etape `arrived`, affiche un message : "En attente de verification par le client. Le client doit verifier le colis et payer le solde via Paystack. La livraison sera automatiquement marquee comme terminee." Affiche aussi les gains du livreur.

#### 4. Affichage de la livraison active

Pour chaque livraison active, affiche :
- Le badge de statut (couleurs differentes par etape)
- Les points de collecte avec bouton navigation GPS (ouvrir Google Maps/Waze avec les coordonnees lat/lng)
- Le point de livraison avec nom + telephone du destinataire (lien `tel:`)
- Le bouton d'action pour l'etape suivante
- A l'etape `arrived` : message d'attente en jaune, pas de bouton

#### 5. Flux de retour (commande annulee apres pickup)

Quand le client annule apres le pickup, le systeme cree automatiquement une nouvelle livraison de retour (`is_return: true`). Le livreur la voit dans ses livraisons actives.

Identifie les retours par `delivery.is_return === true`. Affiche un badge ambre "Retour" au lieu du badge standard.

Le retour suit 3 etapes avec un mapping technique special (pour contourner les contraintes CHECK de la DB) :

| Etape retour | `status` (DB) | `return_status` (DB) | Action livreur |
|-------------|--------------|---------------------|----------------|
| En route vendeur | in_progress | en_route_vendor | Bouton "Arrive chez vendeur" |
| Arrive vendeur | arrived | arrived_vendor | Message "En attente de confirmation du vendeur" |
| Retourne | delivered | returned | "Retour confirme" (aucune action) |

Mise a jour pour un retour :

```typescript
// Arrivee chez le vendeur
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

Le livreur ne peut PAS marquer "retourne". C'est le vendeur qui confirme sur le dashboard web.

#### 6. Historique des livraisons

```typescript
const { data: history } = await supabase
  .from("delivery_requests")
  .select("*, delivery_zones(name, city), order:orders!order_id(order_number)")
  .eq("driver_id", userId)
  .in("status", ["delivered", "cancelled"])
  .order("created_at", { ascending: false })
  .limit(50);
```

Pour chaque livraison dans l'historique :
- Badge vert "Livree" ou rouge "Annulee" ou vert "Retourne" (si `is_return && return_status === "returned"`)
- Date
- Numero de commande
- Gains (seulement si `!is_return` ET `status === "delivered"` ou `status === "cancelled"` avec `delivery_fee_kept`)
- Points de collecte et livraison

#### 7. Recettes du livreur (versements)

Recupere les infos de versement pour chaque livraison dans l'historique :

```typescript
const deliveryIds = history.map(d => d.id);
const { data: payouts } = await supabase
  .from("pending_payouts")
  .select("delivery_request_id, status, amount")
  .in("delivery_request_id", deliveryIds)
  .eq("recipient_id", userId);
```

Affiche a cote de chaque livraison un badge de versement :
- `pending` -> Badge "En attente" (gris)
- `processing` -> Badge "En cours" (bleu)
- `paid` -> Badge "Paye" (vert)

Calcul du total du jour :

```typescript
const today = new Date().toDateString();
const todayEarnings = history
  .filter(d => {
    const date = new Date(d.delivered_at || d.created_at).toDateString();
    return date === today && !d.is_return && d.status === "delivered";
  })
  .reduce((sum, d) => sum + (d.driver_earnings || 0), 0);
```

Affiche le total du jour en haut de l'historique.

**Regle : Les retours (`is_return: true`) ne generent PAS de gains et ne sont PAS comptes dans le total.**

#### 8. Annulation par le livreur

Le livreur peut annuler seulement avant d'avoir recupere le colis (statuts `assigned` ou `in_progress`).

```typescript
// Recuperer les motifs
const { data: reasons } = await supabase
  .from("cancellation_reasons")
  .select("id, label")
  .eq("is_active", true);

// Creer l'annulation
await supabase.from("cancellations").insert({
  order_id: delivery.order_id,
  cancelled_by: userId,
  canceller_role: "driver",
  reason_id: selectedReasonId,
  custom_reason: customReasonText,
  status_at_cancellation: delivery.status,
  requires_return: false,
});

// Mettre a jour la livraison
await supabase
  .from("delivery_requests")
  .update({ status: "cancelled" })
  .eq("id", delivery.id)
  .eq("driver_id", userId);
```

#### 9. Realtime — Ecouter les mises a jour

```typescript
const channel = supabase
  .channel("driver-deliveries")
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "delivery_requests",
  }, (payload) => {
    // Rafraichir toutes les listes (disponibles, actives, historique)
    if (payload.eventType === "UPDATE" && payload.new.driver_id === userId) {
      if (payload.new.status === "delivered") {
        // Notification: "Livraison terminee ! Le client a paye le solde."
      } else if (payload.new.status === "cancelled") {
        // Notification: "Commande annulee par le client. Retour du colis a initier."
      }
    }
  })
  .subscribe();
```

#### 10. Tables utilisees

| Table | Usage |
|-------|-------|
| delivery_requests | Livraisons (disponibles, actives, historique, retours) |
| delivery_zones | Zones geographiques |
| driver_zones | Zones assignees au livreur |
| orders | Infos commande (numero, statut paiement) |
| cancellation_reasons | Motifs d'annulation |
| cancellations | Enregistrer les annulations |
| pending_payouts | Suivi des versements/recettes |
| profiles | Profil livreur, position GPS, disponibilite |

---

## Resume des actions

| Action | Detail |
|--------|--------|
| Nettoyage DB | Migration SQL pour purger toutes les donnees transactionnelles |
| Prompt mobile | Prompt complet ci-dessus, pret a copier dans Bolt.new |

