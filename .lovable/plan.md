

# Correction du flux d'annulation a l'arrivee et du retour produit

## Problemes identifies

### 1. Paiement livreur non cree (pending_payouts)
La table `pending_payouts` a une politique RLS qui n'autorise que les admins a inserer des enregistrements. Le client qui annule ne peut pas creer de payout pour le livreur. L'insertion echoue silencieusement.

### 2. return_status jamais mis a jour
L'ordre des operations est incorrect :
- Ligne 207-211 : TOUTES les livraisons sont annulees (`status = "cancelled"`)
- Ligne 220-223 : Tentative de mise a jour de `return_status = "returning"` sur la livraison originale
- Mais la politique RLS "Customers can cancel their delivery requests" bloque les UPDATE quand `status = 'cancelled'`
- Resultat : `return_status` reste NULL

### 3. Retour produit sans nom distinctif
Les livraisons retour n'ont aucun libelle pour les differencier des livraisons standard dans l'interface du livreur.

### 4. Etapes de retour non gerees cote livreur
Le livreur n'a aucune interface pour gerer les 3 etapes du retour : en_route_vendor, arrived_vendor, returned. Il voit la livraison retour comme une livraison standard ou ne la voit pas du tout.

## Corrections prevues

### 1. `src/components/orders/RequestCancellationDialog.tsx`

**Reordonner les operations** pour que le payout et le retour soient crees AVANT l'annulation des livraisons :

```text
Ancien ordre :
  1. Annuler TOUTES les livraisons (status = cancelled)
  2. Mettre return_status = "returning" (BLOQUE par RLS)
  3. Creer pending_payout (BLOQUE par RLS)
  4. Creer livraison retour

Nouveau ordre :
  1. Mettre return_status = "returning" sur livraison originale (avant annulation)
  2. Annuler la livraison originale (status = cancelled)  
  3. Creer la livraison retour avec driver_id pre-assigne et statut "en_route_vendor"
  4. Creer pending_payout via la livraison retour (le livreur est deja assigne)
```

**Assigner le meme livreur** a la livraison retour : puisque le livreur est deja chez le client avec le colis, la livraison retour doit etre pre-assignee au meme livreur avec le statut `en_route_vendor` (pas `pending`).

**Ajouter un label** a la livraison retour : stocker dans `pickup_point` un champ descriptif comme "Retour colis ORD-XXXX vers Boutique YYYY".

### 2. RLS sur `pending_payouts`

Ajouter une politique RLS permettant aux clients d'inserer des payouts pour les livreurs lors d'annulations. Alternative : deplacer la creation du payout dans une fonction SQL `SECURITY DEFINER` ou dans le trigger existant `sync_order_status_from_delivery`.

Option retenue : ajouter une politique INSERT restrictive sur `pending_payouts` qui autorise l'insertion si l'utilisateur est le proprietaire de la commande associee.

### 3. `src/components/driver/DriverDeliveriesSection.tsx`

**Afficher les livraisons retour** dans "Mes livraisons" avec un libelle distinctif :
- Nom : "Retour colis [order_number] vers [shop_name]"
- Badge : "Retour" en orange au lieu du badge de statut standard
- 3 etapes de retour :
  - `en_route_vendor` : Bouton "Arrive chez vendeur"
  - `arrived_vendor` : Message "En attente de confirmation vendeur"
  - `returned` : Affiche "Retour confirme"

**Adapter la query `my-deliveries`** pour inclure les livraisons retour (`is_return = true`) avec leurs statuts specifiques.

**Adapter `getNextStatusAction`** pour les retours :
- `en_route_vendor` -> "Arrive chez vendeur" (next: `arrived_vendor`)
- `arrived_vendor` -> Pas d'action (le vendeur confirme)

### 4. `src/components/shops/tabs/OrdersTab.tsx`

**Section retours du vendeur** : Le bouton "Confirmer reception" doit :
- Mettre a jour `return_status = "returned"` sur la livraison retour (pas seulement l'originale)
- Aussi mettre a jour le `status` de la livraison retour a `delivered` (ou equivalent)
- Restaurer le stock du produit

## Detail technique

```text
Livraison retour creee :
  - is_return: true
  - driver_id: [meme livreur que la livraison originale]
  - status: "en_route_vendor" (le livreur demarre immediatement)
  - return_status: null (ce champ est sur la livraison originale)
  - pickup_point: [adresse du client] + label "Retour colis ORD-XXXX"
  - delivery_point: [adresse du vendeur]

Livraison originale mise a jour :
  - return_status: "returning"
  - status: "cancelled"

Pending payout cree :
  - recipient_id: [driver_id]
  - amount: [driver_earnings de la livraison originale]
  - delivery_request_id: [id livraison originale]

Etapes du retour cote livreur :
  en_route_vendor -> arrived_vendor -> (vendeur confirme) -> returned
```

## Migration SQL necessaire

Ajout d'une politique RLS INSERT sur `pending_payouts` pour permettre aux clients de creer des payouts lors d'annulations de leurs commandes :

```sql
CREATE POLICY "Clients can create payouts for cancelled orders"
ON pending_payouts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = pending_payouts.order_id 
    AND orders.user_id = auth.uid()
    AND orders.status = 'cancelled'
  )
);
```

## Fichiers modifies

1. `src/components/orders/RequestCancellationDialog.tsx` -- Reordonnancement des operations, label retour, driver pre-assigne
2. `src/components/driver/DriverDeliveriesSection.tsx` -- Interface retour avec 3 etapes
3. `src/components/shops/tabs/OrdersTab.tsx` -- Confirmation retour amelioree
4. Migration SQL -- Politique RLS pour pending_payouts

