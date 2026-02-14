
# Correction de l'annulation a l'arrivee du livreur

## Probleme

Le bouton "Annuler la commande" visible quand le livreur est arrive (statut `arrived`) utilise une mutation inline `cancelAtArrival` (lignes 180-248 de `ClientOrderDetailSheet.tsx`) qui contourne completement le dialogue de motif d'annulation (`RequestCancellationDialog`). Cette mutation a 4 problemes :

1. **Pas de pop-up de motif** : l'annulation est executee directement sans demander la raison au client
2. **Paiement livreur incorrect** : calcule `delivery_fee + commission_amount` au lieu de `driver_earnings` (les gains reels du livreur)
3. **Pas de remboursement cree** : aucun enregistrement dans la table `refunds`, l'acompte du client est perdu
4. **Pas de retour produit fonctionnel** : le `return_status` est mis a `"returning"` mais aucune livraison retour n'est creee dans `delivery_requests`

## Corrections prevues

### 1. `src/components/orders/ClientOrderDetailSheet.tsx`

- Supprimer la mutation `cancelAtArrival` (lignes 180-248)
- Remplacer le bouton "Annuler la commande" dans la zone "Le livreur est arrive" (ligne 403-415) par un appel a `handleCancelClick()` qui ouvre le `RequestCancellationDialog`
- Le dialogue gere deja les motifs, l'upload de pieces jointes, et le calcul de remboursement

### 2. `src/components/orders/RequestCancellationDialog.tsx`

Adapter la logique pour les annulations au statut `arrived` :

- **Paiement livreur** : Apres annulation, creer un `pending_payouts` pour le livreur avec le montant `deliveryRequest.driver_earnings` (et non `delivery_fee + commission_amount`). Le livreur s'est deplace, il doit etre paye.
- **Remboursement client** : Pour `refundType === "product_only"` (apres pickup/arrived), `net_refund = 0` car l'acompte couvre les frais du livreur et la commission plateforme. Ceci est deja en place.
- **Retour produit** : Creer une livraison retour (`is_return = true`) dans `delivery_requests` avec les points de livraison inverses (le point de livraison du client devient le pickup, et le point de pickup du vendeur devient la destination). Mettre `return_status = "returning"` sur la livraison originale.
- **Condition d'annulation** : Permettre l'annulation quand le statut est `arrived` (c'est le cas specifique ou le client a le choix entre payer ou annuler)

### 3. Verification de coherence

- Le `getStatusInfo()` dans `RequestCancellationDialog` doit retourner `canCancel: true` et `refundType: "product_only"` quand le statut est `arrived` (deja le cas dans le code actuel)
- Le `canCancelBeforePickup()` dans `ClientOrderDetailSheet` ne doit pas etre utilise pour le cas `arrived` (c'est un flux different, gere par `isDriverArrived`)

## Fichiers modifies

1. `src/components/orders/ClientOrderDetailSheet.tsx` -- Supprimer `cancelAtArrival`, utiliser le dialogue pour l'annulation a l'arrivee
2. `src/components/orders/RequestCancellationDialog.tsx` -- Ajouter creation payout livreur + livraison retour apres annulation au statut arrived
