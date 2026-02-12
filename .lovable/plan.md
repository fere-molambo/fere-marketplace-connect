

# Plan : Corriger l'annulation livreur + ajuster l'UI prepaye vs cash

## Probleme

1. **Erreur invisible** : le toast affiche "Erreur lors de l'annulation" sans detail. Impossible de diagnostiquer le probleme exact sans voir le message d'erreur de la base de donnees.

2. **UI prepaye pas encore correcte** : pour les commandes payees d'avance, le livreur voit encore un ecran intermediaire. Il devrait juste voir un bouton "Confirmer l'annulation" avec un message expliquant que les frais de livraison sont retenus et le client rembourse du montant produit uniquement.

3. **UI cash correcte** : le livreur choisit entre "Annule, livraison payee" et "Annule, livraison non payee". Pas de mention de "penalite" cote livreur.

## Solution

### Fichier modifie : `DriverCancellationDialog.tsx`

1. **Ameliorer les messages d'erreur** : afficher le vrai message d'erreur dans le toast et la console pour chaque etape (cancellation, delivery update, order update, refund, penalty). Cela permettra de diagnostiquer immediatement si l'erreur persiste.

2. **Simplifier le flux prepaye** : quand `isOnlinePayment` est vrai et que le livreur clique sur "Client refuse - Annuler", passer directement a l'annulation sans ecran intermediaire (un seul clic au lieu de deux). Afficher juste un message d'information et le bouton de confirmation.

3. **Garder le flux cash tel quel** : deux boutons "Annule, livraison payee" / "Annule, livraison non payee" -- deja en place.

4. **Toast de succes** : retirer la mention "Penalite appliquee au client" du message de succes visible par le livreur. Remplacer par "Commande annulee. Livraison non payee."

## Details techniques

- Ligne 148-151 : enrichir `onError` avec `error.message` dans le toast
- Ligne 137-141 : ajuster le message de succes pour le cas cash non paye (retirer "penalite")
- Le flux prepaye (lignes 226-245) est deja simplifie avec un seul bouton -- pas de changement majeur necessaire

## Impact
- Le diagnostic de l'erreur persistante sera possible immediatement
- L'experience livreur sera conforme aux regles metier
- Aucune migration SQL necessaire
