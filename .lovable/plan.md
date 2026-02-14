
# Correction du flux de retour produit

## Probleme identifie

La contrainte CHECK sur `delivery_requests.status` n'autorise que ces valeurs :
`pending, assigned, in_progress, picked_up, en_route_client, arrived, delivered, cancelled`

Le code essaie d'inserer une livraison retour avec `status: "en_route_vendor"`, ce qui viole cette contrainte. L'insertion echoue silencieusement, et aucune livraison retour n'est creee.

Le meme probleme se produit quand le livreur clique "Arrive chez vendeur" : le code tente de mettre `status: "arrived_vendor"`, qui est aussi invalide.

Les valeurs `en_route_vendor`, `arrived_vendor`, `returned` n'existent que dans la colonne `return_status`, pas dans `status`.

## Solution

Utiliser le champ `status` avec des valeurs standard (`in_progress`, `arrived`, `delivered`) et le champ `return_status` pour le suivi specifique du retour. Le champ `is_return: true` permet de distinguer visuellement les retours des livraisons normales.

### Mapping des etapes retour

```text
Etape retour           | status       | return_status
-----------------------|------------- |---------------
En route vers vendeur  | in_progress  | en_route_vendor
Arrive chez vendeur    | arrived      | arrived_vendor
Retour confirme        | delivered    | returned
```

## Fichiers modifies

### 1. `src/components/orders/RequestCancellationDialog.tsx`

Corriger l'insertion de la livraison retour :
- `status: "in_progress"` au lieu de `"en_route_vendor"`
- Ajouter `return_status: "en_route_vendor"` pour le suivi

### 2. `src/components/driver/DriverDeliveriesSection.tsx`

**Query `my-deliveries`** : La livraison retour avec `status: "in_progress"` sera automatiquement visible (pas filtree).

**`getNextStatusAction`** : Pour les retours (`is_return: true`), utiliser `return_status` au lieu de `status` pour determiner l'etape :
- `return_status === "en_route_vendor"` : Bouton "Arrive chez vendeur" (met `status: "arrived"` + `return_status: "arrived_vendor"`)
- `return_status === "arrived_vendor"` : Pas d'action (vendeur confirme)
- `return_status === "returned"` : Pas d'action

**`updateStatus` mutation** : Adapter pour les retours -- mettre a jour `status` ET `return_status` simultanement.

### 3. `src/components/shops/tabs/OrdersTab.tsx`

Quand le vendeur confirme la reception du retour :
- `status: "delivered"` + `return_status: "returned"` sur la livraison retour
- `return_status: "returned"` sur la livraison originale
- Restauration du stock produit

### 4. Migration SQL

Nettoyer les donnees de test pour pouvoir retester :

```sql
DELETE FROM pending_payouts;
DELETE FROM refunds;
DELETE FROM client_penalties;
UPDATE orders SET cancellation_id = NULL WHERE cancellation_id IS NOT NULL;
DELETE FROM cancellations;
DELETE FROM delivery_requests;
DELETE FROM order_items;
DELETE FROM payment_transactions;
DELETE FROM orders;
DELETE FROM service_bookings;
```
