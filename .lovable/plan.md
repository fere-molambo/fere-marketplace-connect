

# Diagnostic : Remboursement non créé lors de l'annulation mobile

## Constat

La base de données confirme :
- **Commande** `4a9a6fa0...` : status `cancelled`, payment_status `partial`, advance_paid `909 FCFA`
- **Annulation** `c8d6fd14...` : refund_amount `909`, status_at_cancellation `pending` (avant récupération)
- **Refunds** : **table vide** — aucun remboursement n'a été créé

## Cause

La création du remboursement n'est **pas automatisée par un trigger**. C'est le **code client** qui insère le record dans la table `refunds` au moment de l'annulation.

Sur l'app web, c'est fait dans `RequestCancellationDialog.tsx` (ligne 293) :
```ts
await supabase.from("refunds").insert({
  order_id, user_id, amount, net_refund, status: "pending", ...
});
```

L'app mobile (Bolt.new) crée bien l'enregistrement `cancellations` mais **ne crée pas** le record `refunds` correspondant.

## Solution

**Deux options** :

### Option A — Corriger côté mobile (Bolt.new) *(recommandé)*
Donner ce prompt à Bolt :

> Lors de l'annulation d'une commande, après avoir créé le record dans `cancellations` et mis à jour le statut de la commande à `cancelled`, **insérer un record dans la table `refunds`** si `payment_status` est `paid` ou `partial` et que l'annulation se fait avant la récupération du produit (refund total). Insérer :
> ```
> { order_id, user_id, amount: advance_paid, net_refund: advance_paid,
>   transaction_fee_deducted: 0, original_payment_reference: payment_reference,
>   status: 'pending', refund_status: 'pending', cancellation_id }
> ```
> Faire pareil pour les réservations de services annulées avant départ du prestataire : insérer dans `refunds` avec `booking_id` au lieu de `order_id` et `amount: travel_fee`.

### Option B — Ajouter un trigger automatique côté base de données
Créer un trigger `AFTER INSERT ON cancellations` qui crée automatiquement le refund. Cela fonctionnerait pour les deux apps (web et mobile) sans modification du code client.

**Je recommande l'Option B** car elle centralise la logique et évite que le problème se reproduise si un autre client oublie l'insertion.

## Plan d'implémentation (Option B)

Créer une migration SQL avec :

1. **Un trigger `AFTER INSERT ON cancellations`** qui :
   - Récupère la commande ou le booking associé
   - Vérifie si `payment_status` est `paid` ou `partial`
   - Calcule le montant à rembourser selon le `status_at_cancellation`
   - Insère dans `refunds` si `net_refund > 0`

2. **Supprimer le code d'insertion côté web** dans `RequestCancellationDialog.tsx` (lignes 288-304) et `ClientBookingDetailSheet.tsx` (lignes 145-156) pour éviter les doublons — ou ajouter un `ON CONFLICT DO NOTHING` dans le trigger.

3. **Créer manuellement le refund manquant** pour la commande actuelle via un INSERT.

## Pour la commande actuelle

Insérer immédiatement le refund manquant pour débloquer l'utilisateur.

