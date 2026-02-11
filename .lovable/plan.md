

# Fix : La livraison annulee reste visible chez le livreur

## Cause

C'est exactement le meme bug RLS que pour les commandes : la politique "Customers can cancel their delivery requests" sur la table `delivery_requests` a une clause **WITH CHECK** qui rejette le nouveau statut `cancelled`.

La commande a bien ete annulee (status = `cancelled`), mais la mise a jour de la `delivery_requests` a echoue silencieusement. Le statut de la livraison est toujours `in_progress`, donc le livreur voit encore le bouton "Colis recupere".

## Solution

Modifier la politique RLS sur `delivery_requests` pour deplacer la restriction de statut dans la clause **USING** (comme on l'a fait pour `orders`).

## Details techniques

### Migration SQL

```sql
DROP POLICY "Customers can cancel their delivery requests" ON public.delivery_requests;

CREATE POLICY "Customers can cancel their delivery requests"
ON public.delivery_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = delivery_requests.order_id
    AND orders.user_id = auth.uid()
  )
  AND status <> ALL (ARRAY['delivered'::text, 'cancelled'::text])
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = delivery_requests.order_id
    AND orders.user_id = auth.uid()
  )
);
```

Apres cette migration, il faudra aussi corriger manuellement la livraison existante qui est bloquee en `in_progress` :

```sql
UPDATE delivery_requests
SET status = 'cancelled'
WHERE order_id = '518f2358-c232-47bb-9845-fdff8fe9c30b';
```

Aucune modification de code frontend necessaire -- le code dans `RequestCancellationDialog` essaie deja de mettre le statut a `cancelled`, il etait juste bloque par la politique RLS.

