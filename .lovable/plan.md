
# Correction : Annulation prepaye - supprimer le choix inutile

## Probleme identifie

Pour une commande prepayee (payment_method = "online"), le livreur voit encore les deux boutons "Annule, livraison payee" / "Annule, livraison non payee" au lieu du flux simplifie avec un seul bouton "Confirmer l'annulation".

Le code actuel a bien une branche `isOnlinePayment` (ligne 227) mais elle ne fonctionne pas correctement. Il y a deux causes possibles :
- La valeur `delivery?.order?.payment_method` n'est pas accessible au moment du rendu
- Un probleme de cache ou de deploiement

## Solution

### Fichier modifie : `DriverCancellationDialog.tsx`

1. **Ajouter un log de diagnostic** : afficher temporairement dans la console la valeur de `payment_method` pour confirmer ce que recoit le composant.

2. **Pour les commandes prepayees** : quand le livreur clique "Client refuse - Annuler", passer directement a l'annulation (appeler `cancelDelivery.mutate({ clientPaidDelivery: true })`) sans afficher l'ecran intermediaire. Pas besoin de choix car la livraison est automatiquement consideree comme payee (le client a deja paye en ligne).

3. **Pour les commandes cash** : garder le flux actuel avec les deux boutons "Annule, livraison payee" / "Annule, livraison non payee".

### Changements concrets

- **Bouton "Client refuse - Annuler"** : si `isOnlinePayment`, appeler directement la mutation d'annulation au lieu de naviguer vers `cancel_options`. Un Dialog de confirmation simple s'affichera avec le message explicatif et le bouton de confirmation.

- **Step `cancel_options`** : ne sera affiche que pour les commandes cash (avec les deux boutons de choix).

- **Ajout d'un console.log** : `console.log("payment_method:", delivery?.order?.payment_method)` pour diagnostiquer si la valeur est bien recue.

## Flux final

**Commande prepayee (online)** :
1. Livreur voit "Client accepte - Confirmer livraison" et "Client refuse - Annuler"
2. Clic sur "Client refuse - Annuler" → dialogue de confirmation avec message "Les frais de livraison seront retenus. Le client sera rembourse du montant des produits."
3. Un seul bouton "Confirmer l'annulation"

**Commande cash** :
1. Livreur voit "Cash recu - Confirmer livraison" et "Client refuse - Annuler"
2. Clic sur "Client refuse - Annuler" → ecran avec question "Le client a-t-il paye les frais de livraison ?"
3. Deux boutons : "Annule, livraison payee" / "Annule, livraison non payee"

## Impact
- Un seul fichier modifie
- Corrige le probleme visible sur la capture d'ecran
- Aucune migration SQL
