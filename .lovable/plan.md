

# Correction : Versements manquants pour commandes livrées et annulées

## Diagnostic

**Deux problèmes identifiés :**

### 1. Pas de trigger AFTER INSERT sur `payment_transactions`
Le seul trigger existant est `on_payment_transaction_update` (AFTER UPDATE). L'app mobile insère les transactions de solde directement avec `status = 'success'` (références `BAL_xxx`), donc le trigger ne se déclenche jamais et aucun payout n'est créé.

De plus, la fonction `sync_order_payment_from_transaction` utilise `OLD.status != 'success'` — `OLD` est NULL lors d'un INSERT, ce qui causerait une erreur.

**Commandes affectées :**
- `906700ad` (livrée, payée) — 0 payout vendeur, 0 payout livreur
- `80f9ab47` (livrée, payée) — 0 payout vendeur, 0 payout livreur

### 2. Pas de payout livreur pour l'annulation après pickup
La commande `e0489b97` a été annulée après expédition (`status_at_cancellation = shipped`). Le retour a bien été créé et livré, mais aucun payout livreur n'existe (le code frontend `RequestCancellationDialog` crée le payout côté client, mais il semble que le RLS ou une erreur a empêché l'insertion).

## Solution — Migration SQL unique

### Étape 1 : Modifier la fonction trigger pour supporter INSERT
Changer la condition de `OLD.status != 'success'` à `(OLD IS NULL OR OLD.status != 'success')`.

### Étape 2 : Ajouter un trigger AFTER INSERT
```sql
CREATE TRIGGER on_payment_transaction_insert
AFTER INSERT ON payment_transactions
FOR EACH ROW
WHEN (NEW.status = 'success')
EXECUTE FUNCTION sync_order_payment_from_transaction();
```

### Étape 3 : Insérer les payouts manquants pour les commandes existantes

**Commande `906700ad` (livrée) :**
- Vendor payout : 3000 - 400 = 2600 FCFA
- Driver payout : 400 FCFA

**Commande `80f9ab47` (livrée) :**
- Vendor payout : 1000 - 200 = 800 FCFA
- Driver payout : 400 FCFA

**Commande `e0489b97` (annulée après pickup) :**
- Driver payout : 400 FCFA (compensation pour le trajet)

Aucun changement frontend nécessaire.

