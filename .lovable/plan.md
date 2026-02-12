
# Plan : Corriger l'annulation par le livreur (erreurs RLS)

## Probleme

Quand le livreur tente d'annuler une commande au stade "arrive", la mutation echoue silencieusement a cause de politiques RLS trop restrictives sur 3 tables :

1. **orders** : le UPDATE n'est autorise que si `auth.uid() = user_id` (le client). Le livreur ne peut pas mettre a jour le statut de la commande.
2. **refunds** : le INSERT exige `user_id = auth.uid()` et que la commande appartienne a l'utilisateur. Le livreur insere un remboursement pour le client, pas pour lui-meme.
3. **client_penalties** : seuls les admins peuvent inserer des penalites.

## Solution

Ajouter des politiques RLS specifiques pour les livreurs via une migration SQL.

### Migration SQL

```sql
-- 1. Permettre aux livreurs de mettre a jour les commandes qu'ils livrent
CREATE POLICY "Drivers can update orders they deliver"
  ON orders FOR UPDATE
  USING (
    has_role(auth.uid(), 'livreur') AND
    EXISTS (
      SELECT 1 FROM delivery_requests
      WHERE delivery_requests.order_id = orders.id
      AND delivery_requests.driver_id = auth.uid()
    )
  );

-- 2. Permettre aux livreurs de creer des remboursements pour les commandes qu'ils livrent
CREATE POLICY "Drivers can create refunds for deliveries"
  ON refunds FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'livreur') AND
    EXISTS (
      SELECT 1 FROM delivery_requests
      WHERE delivery_requests.order_id = refunds.order_id
      AND delivery_requests.driver_id = auth.uid()
    )
  );

-- 3. Permettre aux livreurs de creer des penalites pour les commandes qu'ils livrent
CREATE POLICY "Drivers can create penalties for deliveries"
  ON client_penalties FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'livreur') AND
    EXISTS (
      SELECT 1 FROM delivery_requests
      WHERE delivery_requests.order_id = client_penalties.source_order_id
      AND delivery_requests.driver_id = auth.uid()
    )
  );
```

### Aucune modification de code frontend

Le code dans `DriverCancellationDialog.tsx` est deja correct. Seules les permissions de la base de donnees bloquent l'execution.

## Impact

- Un seul fichier de migration SQL
- Pas de changement cote frontend
- Les livreurs pourront annuler les commandes qu'ils livrent et creer les enregistrements financiers associes
