

# Fix : Politique RLS bloquant l'annulation de commande

## Probleme

Quand un client tente d'annuler sa commande (avant que le livreur ait recupere le colis), la mise a jour echoue car la politique RLS "Users can cancel their own orders" sur la table `orders` rejette le changement.

La cause est dans la clause **WITH CHECK** qui verifie la **nouvelle** valeur de `status`. Puisque le code met `status = 'cancelled'`, la condition `status <> 'cancelled'` rejette l'update.

## Solution

Modifier la politique RLS pour deplacer la restriction de statut dans la clause **USING** (qui verifie l'etat actuel de la ligne) :

- **USING** : l'utilisateur est le proprietaire ET le statut actuel n'est ni `delivered` ni `cancelled`
- **WITH CHECK** : l'utilisateur est le proprietaire (sans restriction sur le nouveau statut)

Ainsi, on peut passer le statut a `cancelled`, tout en empechant de modifier une commande deja livree ou deja annulee.

## Details techniques

Migration SQL a executer :

```sql
DROP POLICY "Users can cancel their own orders" ON public.orders;

CREATE POLICY "Users can cancel their own orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status <> ALL (ARRAY['delivered'::text, 'cancelled'::text])
)
WITH CHECK (
  auth.uid() = user_id
);
```

Aucune modification de code frontend n'est necessaire. Le composant `RequestCancellationDialog` fonctionne deja correctement, c'est uniquement la politique de securite de la base de donnees qui bloque.

