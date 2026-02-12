

# Plan : Corriger l'erreur d'annulation par le livreur + ajuster l'UI

## Probleme

Deux problemes identifies :

### 1. Erreur base de donnees (bloquant)
La table `cancellations` a une contrainte CHECK sur `canceller_role` qui n'accepte que : `client`, `driver`, `vendor`, `admin`. Or le code envoie `"livreur"` -- d'ou l'erreur.

### 2. Logique UI a ajuster
Pour les commandes prepayees (en ligne), le livreur ne devrait pas voir "Oui, livraison payee" ni "penalite". L'annulation est directe : les frais de livraison sont retenus, le client est rembourse du montant produit seulement, pas de penalite.

## Solution

### Migration SQL (1 fichier)
Aucun changement de contrainte necessaire -- il suffit de corriger la valeur envoyee dans le code (`"livreur"` vers `"driver"`).

### Modification de `DriverCancellationDialog.tsx`

1. **Ligne 69** : changer `canceller_role: "livreur"` en `canceller_role: "driver"`

2. **Flux prepaye (online)** : simplifier pour que le bouton "Confirmer l'annulation" appelle directement `cancelDelivery({ clientPaidDelivery: true })` sans choix supplementaire. Le texte expliquera que les frais de livraison sont retenus et le client sera rembourse du montant produit.

3. **Flux cash** : garder les 2 boutons mais renommer :
   - "Annule, livraison payee" (icone billet)
   - "Annule, livraison non payee" (icone X)
   - Retirer le texte "penalite client" visible par le livreur

## Details techniques

Fichier modifie : `src/components/driver/DriverCancellationDialog.tsx`
- Corriger `canceller_role` de `"livreur"` a `"driver"` (ligne 69)
- Ajuster le texte et les boutons du step `cancel_options` pour les 2 cas (prepaye vs cash)
- Aucune migration SQL necessaire

## Impact
- Corrige immediatement l'erreur pour la commande ORD-20260212-DCB804FD
- Simplifie l'experience livreur pour les commandes prepayees
- Garde la logique cash avec choix livraison payee/non payee

