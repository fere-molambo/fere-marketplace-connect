

# Plan : Corriger les versements vendeurs pour les reservations de services

## Probleme identifie

Quand un client paie le solde d'une prestation (100% ou 50%), le code dans `PaymentCallback.tsx` tente de creer un `pending_payout` pour le vendeur. Mais cette insertion echoue silencieusement a cause de la politique RLS sur la table `pending_payouts` : seuls les admins ou les clients avec une commande annulee peuvent inserer des lignes.

De plus, les frais de deplacement (travel_fee) ne sont pas inclus dans le calcul du versement vendeur.

## Solution : Deplacer la logique dans un trigger SQL

Plutot que de corriger le RLS et garder la logique cote client (fragile), la solution est de creer un **trigger sur `service_bookings`** qui cree automatiquement les `pending_payouts` quand le statut passe a `completed` ou `partial`. C'est le meme pattern que `sync_order_payment_from_transaction` pour les commandes produits.

## Etape 1 : Migration SQL - Creer le trigger

Creer une fonction `handle_service_booking_payout()` et un trigger :

```text
CREATE OR REPLACE FUNCTION handle_service_booking_payout()
RETURNS trigger AS $$
DECLARE
  v_vendor_id uuid;
  v_vendor_amount numeric;
  v_already_exists boolean;
BEGIN
  -- Seulement quand le statut passe a 'completed' ou 'partial'
  IF (NEW.status IN ('completed', 'partial')) AND (OLD.status NOT IN ('completed', 'partial')) THEN

    -- Recuperer le vendeur (owner de la boutique du service)
    SELECT sh.owner_id INTO v_vendor_id
    FROM services s
    JOIN shops sh ON sh.id = s.shop_id
    WHERE s.id = NEW.service_id;

    IF v_vendor_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Verifier qu'un payout n'existe pas deja pour cette reservation
    SELECT EXISTS(
      SELECT 1 FROM pending_payouts WHERE booking_id = NEW.id AND recipient_type = 'vendor'
    ) INTO v_already_exists;

    IF v_already_exists THEN
      RETURN NEW;
    END IF;

    -- Calculer le montant : (prix du service - commission) + frais de deplacement
    v_vendor_amount := (COALESCE(NEW.total_price, 0) - COALESCE(NEW.commission_amount, 0))
                     + COALESCE(NEW.travel_fee, 0);

    IF v_vendor_amount > 0 THEN
      INSERT INTO pending_payouts (
        recipient_id, recipient_type, amount, booking_id, eligible_at
      ) VALUES (
        v_vendor_id, 'vendor', v_vendor_amount, NEW.id,
        now() + interval '24 hours'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER on_service_booking_completed_payout
  AFTER UPDATE ON service_bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_service_booking_payout();
```

## Etape 2 : Nettoyer PaymentCallback.tsx

Supprimer le bloc de creation de payout dans `PaymentCallback.tsx` (lignes 75-102), puisque le trigger s'en charge desormais. Le code de mise a jour du statut de la reservation (lignes 62-73) reste necessaire.

## Etape 3 : Creer les payouts manquants pour les 2 reservations testees

Executer une requete SQL pour creer les payouts manquants :

- Reservation `d8fbf070` (completed, 100%) : vendeur `4671cff3` recoit 128 - 10 + 100 = 218 FCFA
- Reservation `adac88d4` (partial, 50%) : vendeur `9bc2e77f` recoit 13 - 1 + 0 = 12 FCFA

## Resume des changements

| Fichier / Ressource | Modification |
|---------------------|-------------|
| Migration SQL | Nouveau trigger `handle_service_booking_payout` |
| `PaymentCallback.tsx` | Supprimer le bloc de creation de payout (lignes 75-102) |
| SQL ponctuel | Inserer les 2 payouts manquants |

