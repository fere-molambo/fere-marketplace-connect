

# Correction : Remboursement non cree pour les annulations

## Probleme

La condition a la ligne 218 de `RequestCancellationDialog.tsx` verifie `order.payment_method === "online"` avant de creer l'enregistrement de remboursement. Or, la commande annulee a `payment_method = "advance"` (paiement de l'acompte via Paystack). La condition echoue et aucun remboursement n'est insere dans la table `refunds`.

## Correction

### Fichier : `src/components/orders/RequestCancellationDialog.tsx`

Remplacer la condition de la ligne 218 :

```
// Ancien
if (order.payment_method === "online" && ["paid", "partial"].includes(order.payment_status))

// Nouveau
if (["paid", "partial"].includes(order.payment_status))
```

Le `payment_method` n'est pas pertinent ici. Ce qui compte, c'est que le client ait effectivement paye quelque chose (`payment_status` est `"paid"` ou `"partial"`). Que le paiement soit passe par le mode `"online"` ou `"advance"`, l'acompte a bien ete debite via Paystack et doit etre rembourse.

## Donnees existantes

La commande `ORD-20260213-DB35708C` a `advance_amount = 1122` et `payment_status = "partial"`. Apres cette correction, un enregistrement de remboursement de 1 122 FCFA sera correctement cree lors d'une annulation similaire.

Pour la commande deja annulee, un insert manuel dans la table `refunds` sera necessaire, ou bien le client devra relancer l'annulation. L'option la plus simple est d'inserer manuellement le remboursement via le dashboard SQL.

