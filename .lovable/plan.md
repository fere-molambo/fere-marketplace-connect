

# Plan : Corriger le workflow d'annulation + enrichir l'historique livreur

## Probleme racine identifie

Le trigger DB `sync_order_status_from_delivery` contient un bug : quand une livraison passe au statut `cancelled`, le trigger ne reconnait pas ce cas et retombe dans la branche `ELSE`, remettant la commande au statut `pending` au lieu de `cancelled`. Cela explique :
- Le badge "En attente" sur la commande annulee (capture d'ecran)
- L'absence de refund (les etapes suivantes echouent ou sont annulees)
- L'incoherence visible cote client et admin

## Solution en 4 parties

### Partie 1 : Migration SQL - Corriger le trigger

Modifier `sync_order_status_from_delivery` pour ajouter le comptage des livraisons annulees. Quand toutes les livraisons sont annulees, le statut de la commande est mis a `cancelled` automatiquement. Le trigger ne doit plus jamais remettre a `pending` une commande dont toutes les livraisons sont annulees.

Ajout d'un compteur `v_cancelled_count` et d'une condition :
```text
IF v_cancelled_count = v_total_requests THEN
  -- Ne pas ecraser un statut cancelled existant
  -- Juste s'assurer qu'on ne remet pas a pending
  RETURN NEW;
END IF;
```

Aussi, corriger les donnees existantes pour la commande ORD-20260212-DCB804FD :
- Mettre `orders.status = 'cancelled'`
- Creer le refund manquant (net_refund = 2000 FCFA, delivery fee retained = 625 FCFA)

### Partie 2 : Fiabiliser `DriverCancellationDialog.tsx`

1. Reordonner les etapes de la mutation :
   - Etape 1 : Creer le cancellation record
   - Etape 2 : Mettre a jour la commande (status='cancelled', cancellation_id) AVANT la delivery
   - Etape 3 : Mettre a jour la delivery_request (status='cancelled')
   - Etape 4 : Creer le refund (si online) avec verification d'erreur
   - Etape 5 : Creer la penalite (si cash non paye) avec verification d'erreur

2. Ajouter des verifications d'erreur pour chaque etape (refund et penalty inclus)

3. Invalider aussi `delivery-history` dans le onSuccess

### Partie 3 : Enrichir l'historique du livreur

Modifier la section historique dans `DriverDeliveriesSection.tsx` :

Pour chaque livraison passee, afficher :
- **Type de paiement** : badge "Cash" ou "Prepaye"
- **Statut** : badge existant (Livree / Annulee)
- **Si annulee** : a quelle etape (status_at_cancellation depuis la table cancellations), motif
- **Gains** : montant a recevoir (driver_earnings)
- **Etat de paiement** : badge "En attente" / "Paye" (depuis pending_payouts)

Ajouter en haut de la section historique :
- **Total du jour** : somme des driver_earnings pour les livraisons du jour (delivered + cancelled avec delivery_fee_kept)

La requete d'historique sera enrichie pour joindre `cancellations` et `pending_payouts`.

### Partie 4 : Coherence cote client

Dans `ClientOrderDetailSheet.tsx` :
- Si `order.status === 'cancelled'`, afficher le badge "Annule" (deja gere par OrderStatusBadge)
- Ajouter une section informative quand la commande est annulee : "Votre commande a ete annulee. Un remboursement est en cours." (si paiement online)
- Masquer le tracker de livraison quand la commande est annulee

## Fichiers modifies

1. `supabase/migrations/[timestamp]_fix_sync_trigger_cancelled.sql` (nouveau) - Trigger fix + data fix
2. `src/components/driver/DriverCancellationDialog.tsx` - Reordonnancement des etapes + error checks
3. `src/components/driver/DriverDeliveriesSection.tsx` - Historique enrichi avec type de paiement, gains, total du jour, details d'annulation
4. `src/components/orders/ClientOrderDetailSheet.tsx` - Section annulation + refund info

## Priorite

Les parties 1 et 2 sont critiques (corrigent le bug bloquant). Les parties 3 et 4 sont des ameliorations d'UX.

