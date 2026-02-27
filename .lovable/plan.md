

# Plan : Corriger le statut de paiement des reservations et les versements pour annulations

## Problemes identifies

### 1. "Paye integralement" affiche a tort
Le trigger `sync_order_payment_from_transaction` met `payment_status = 'paid'` pour **tous** les paiements de type `service_booking`, sans distinguer :
- Le paiement de l'acompte (frais de deplacement) -- devrait mettre `partial` et `travel_fee_paid = true`
- Le paiement du solde (100% ou 50%) -- devrait mettre `paid`

Resultat : la reservation annulee `a45b28e7` affiche "Paye integralement" alors que seul l'acompte de 100 FCFA a ete paye.

### 2. Pas de versement vendeur pour les annulations a l'arrivee
Le trigger `handle_service_booking_payout` ne gere que les statuts `completed` et `partial`, pas `cancelled` avec `completion_type = 'cancelled_at_arrival'`. Dans ce cas, le vendeur devrait recevoir les frais de deplacement (moins la commission).

### 3. Pas de remboursement cree lors d'une annulation avant demarrage
Le code dans `handleCancelBeforeOnTheWay` verifie `travelFeePaid` mais ce flag n'est jamais mis a `true` par le trigger. Donc le remboursement n'est jamais cree meme si l'acompte a bien ete paye.

## Corrections

### Migration SQL : Corriger le trigger `sync_order_payment_from_transaction`

Modifier la section `service_booking` pour distinguer l'avance du solde via `metadata->>'is_travel_fee'` :

```text
IF NEW.payment_type = 'service_booking' AND NEW.related_id IS NOT NULL THEN
  IF (NEW.metadata->>'is_travel_fee')::boolean = true THEN
    -- Acompte (frais de deplacement)
    UPDATE service_bookings
    SET payment_status = 'partial',
        travel_fee_paid = true,
        payment_reference = NEW.reference,
        advance_paid = NEW.amount,
        updated_at = now()
    WHERE id = NEW.related_id;
  ELSE
    -- Solde (completion payment)
    UPDATE service_bookings
    SET payment_status = 'paid',
        payment_reference = NEW.reference,
        updated_at = now()
    WHERE id = NEW.related_id;
  END IF;
END IF;
```

### Migration SQL : Etendre le trigger `handle_service_booking_payout`

Ajouter la gestion de `cancelled` avec `completion_type = 'cancelled_at_arrival'` :

```text
-- Existing: completed/partial -> vendor gets (total_price - commission) + travel_fee

-- New: cancelled_at_arrival -> vendor gets travel_fee only (minus travel commission if applicable)
IF NEW.status = 'cancelled'
   AND NEW.completion_type = 'cancelled_at_arrival'
   AND OLD.status != 'cancelled'
   AND COALESCE(NEW.travel_fee, 0) > 0
THEN
  -- Insert payout for vendor = travel_fee
  INSERT INTO pending_payouts (recipient_id, recipient_type, amount, booking_id, eligible_at)
  VALUES (v_vendor_id, 'vendor', NEW.travel_fee, NEW.id, now() + interval '24 hours');
END IF;
```

### Correction donnees : Booking `a45b28e7`

- Mettre `payment_status = 'partial'`, `travel_fee_paid = true`
- Creer un `pending_payout` de 100 FCFA pour le vendeur (frais de deplacement)

### Frontend : Aucune modification necessaire

Le `PaymentStatusBadge` affichera correctement "Acompte paye" au lieu de "Paye integralement" une fois le `payment_status` corrige en `partial`. Le code de `handleCancelBeforeOnTheWay` fonctionnera aussi puisque `travel_fee_paid` sera desormais correctement mis a `true`.

## Resume des changements

| Ressource | Modification |
|-----------|-------------|
| Migration SQL | Corriger `sync_order_payment_from_transaction` (distinguer avance vs solde) |
| Migration SQL | Etendre `handle_service_booking_payout` (gerer `cancelled_at_arrival`) |
| SQL donnees | Corriger booking `a45b28e7` + creer payout manquant |

