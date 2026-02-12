

# Corriger le flux d'annulation pour les commandes prepayees

## Probleme

Actuellement, quand le livreur clique sur "Client refuse - Annuler" pour une commande payee d'avance, il est toujours redirige vers un ecran intermediaire (`cancel_options`). Pour les commandes prepayees, cet ecran intermediaire n'est pas necessaire car la livraison est automatiquement consideree comme payee (le livreur a fait le deplacement).

## Solution

Modifier le bouton "Client refuse - Annuler" pour que, dans le cas d'une commande prepayee (`isOnlinePayment`), il lance directement l'annulation au lieu de naviguer vers l'ecran `cancel_options`.

### Modification dans `DriverCancellationDialog.tsx`

**Bouton "Client refuse - Annuler" (lignes 204-214)** : changer le `onClick` pour appeler directement `cancelDelivery.mutate({ clientPaidDelivery: true })` quand `isOnlinePayment` est vrai, et garder `setStep("cancel_options")` uniquement pour les commandes cash.

```
onClick={() => {
  if (isOnlinePayment) {
    cancelDelivery.mutate({ clientPaidDelivery: true });
  } else {
    setStep("cancel_options");
  }
}}
```

Le livreur verra alors :
- **Commande prepayee** : 2 boutons seulement - "Confirmer livraison" et "Client refuse - Annuler" (qui annule directement)
- **Commande cash** : le bouton "Client refuse - Annuler" ouvre l'ecran avec les 2 choix "Annule, livraison payee" / "Annule, livraison non payee"

## Fichier modifie

`src/components/driver/DriverCancellationDialog.tsx` - une seule modification sur le `onClick` du bouton d'annulation (ligne 207).

