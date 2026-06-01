## Migration : propagation du paiement aux commandes multi-vendeur

### Objectif
Corriger un bug latent sur le multi-vendeur : actuellement, seule la 1ère commande d'un panier multi-boutiques reçoit `payment_status = 'partial'` après l'acompte OM. Les autres restent `pending` malgré le paiement effectif.

### Aucun changement de process métier
- Mono-vendeur produit : identique
- Multi-vendeur produit : identique (juste cohérence DB rétablie)
- Livraison / paiement du solde : **inchangé** (reste 1 paiement par livraison via `payment_type = 'order_balance'`)
- Service booking : **inchangé**
- Commissions, TVA, payouts, refunds, cancellations : **inchangés**

### Changement technique
Une seule migration SQL qui modifie la fonction `sync_order_payment_from_transaction()` :

**Avant** (branche `payment_type = 'order'`) :
```sql
UPDATE orders SET payment_status='partial', ... WHERE id = NEW.related_id;
```

**Après** :
```sql
-- Si metadata.payment_group_id présent → propager à toutes les commandes du groupe
-- Sinon (legacy) → comportement actuel (1 seule commande via related_id)
UPDATE orders 
SET payment_status='partial', payment_reference=NEW.reference, advance_paid=..., updated_at=now()
WHERE (
  (NEW.metadata->>'payment_group_id' IS NOT NULL 
   AND payment_group_id = (NEW.metadata->>'payment_group_id')::uuid)
  OR
  (NEW.metadata->>'payment_group_id' IS NULL AND id = NEW.related_id)
);
```

Les branches `order_balance` et `service_booking` restent strictement identiques.

### Détails clés
- **`advance_paid`** : sur la commande `related_id` on stocke le montant total payé (acompte global), sur les autres commandes du groupe on met leur propre `advance_amount` calculé (chaque order a déjà sa colonne `advance_amount` remplie au checkout). Décision technique : mettre `advance_paid = advance_amount` pour chaque commande du groupe ≠ `related_id`, et `advance_paid = NEW.amount` pour celle = `related_id`. Cela garde la somme cohérente.
- **`payment_reference`** : même référence OM pour toutes les commandes du groupe (normal, c'est la même transaction).
- **Idempotence** : `WHERE payment_status != 'partial' AND payment_status != 'paid'` ajouté pour ne pas écraser des états ultérieurs si la fonction est rejouée.

### Pas de changement code
- `src/pages/Checkout.tsx` : déjà conforme (envoie `metadata.payment_group_id`, crée N orders avec même `payment_group_id`)
- `src/pages/PaymentCallback.tsx` : inchangé
- Edge function `orange-money-payment` : inchangée (propage déjà `metadata` dans `payment_transactions`)
- Mobile (Bolt) : compatible automatiquement dès que Claude pushe son patch (N orders + 1 OM call avec `metadata.payment_group_id`)

### Vérification post-migration
1. Test mono-vendeur web → `partial` sur l'unique commande ✓
2. Test multi-vendeur web (2 boutiques) → `partial` sur les 2 commandes ✓
3. Test paiement du solde → toujours 1 commande à la fois (logique inchangée) ✓
4. Test service booking → inchangé ✓

### Ordre de déploiement recommandé
1. Cette migration SQL (corrige web multi-vendeur immédiatement)
2. Claude pushe son patch mobile (mono-vendeur OK + multi-vendeur OK grâce à la migration)
3. Tests croisés mono + multi sur web et mobile
