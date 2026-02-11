

# Plan : Ajouter les statuts manquants dans la contrainte de la table delivery_requests

## Probleme

L'erreur "Erreur lors de la mise a jour du statut" est causee par une **contrainte CHECK** sur la colonne `status` de la table `delivery_requests`. Cette contrainte n'autorise que 6 valeurs :

```text
pending, assigned, in_progress, picked_up, delivered, cancelled
```

Or le workflow 7 etapes utilise aussi `en_route_client` et `arrived`, qui sont rejetes par la base de donnees.

## Solution

Creer une migration SQL qui :

1. Supprime l'ancienne contrainte `delivery_requests_status_check`
2. Recrée la contrainte avec les 8 statuts du workflow complet

```sql
ALTER TABLE delivery_requests DROP CONSTRAINT delivery_requests_status_check;

ALTER TABLE delivery_requests ADD CONSTRAINT delivery_requests_status_check
  CHECK (status = ANY (ARRAY[
    'pending', 'assigned', 'in_progress', 'picked_up',
    'en_route_client', 'arrived', 'delivered', 'cancelled'
  ]));
```

Egalement ajouter `returning` dans la contrainte `return_status` si ce n'est pas deja present (le code l'utilise dans `DriverCancellationDialog`).

```sql
ALTER TABLE delivery_requests DROP CONSTRAINT delivery_requests_return_status_check;

ALTER TABLE delivery_requests ADD CONSTRAINT delivery_requests_return_status_check
  CHECK (return_status IS NULL OR return_status = ANY (ARRAY[
    'returning', 'en_route_vendor', 'arrived_vendor', 'returned'
  ]));
```

## Impact

- Un seul fichier de migration SQL
- Aucune modification du code frontend
- Corrige immediatement l'erreur pour les livreurs

