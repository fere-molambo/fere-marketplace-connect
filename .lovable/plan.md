
# Fix : Les versements en attente n'apparaissent pas

## Cause

L'erreur PostgREST est :
```
Could not find a relationship between 'pending_payouts' and 'profiles'
using the hint 'pending_payouts_recipient_id_fkey'
```

La colonne `recipient_id` de `pending_payouts` pointe vers `auth.users`, pas vers `profiles`. PostgREST ne peut donc pas faire la jointure automatique demandee par le code.

C'est exactement le meme probleme que celui deja corrige pour les remboursements (refunds).

## Solution

Modifier `src/pages/Payments.tsx` pour utiliser la meme approche en deux etapes :
1. Recuperer les `pending_payouts` sans jointure sur `profiles`
2. Collecter les `recipient_id` uniques et faire un second appel pour chercher les profils
3. Fusionner les donnees cote client

### Fichier modifie

**`src/pages/Payments.tsx`** - Modifier les deux requetes (pending et completed) :

- **Requete "pending-payouts"** (lignes 30-42) : Retirer la jointure `recipient:profiles!pending_payouts_recipient_id_fkey(...)` et ajouter un fetch secondaire des profils par `recipient_id`
- **Requete "completed-payouts"** (lignes 45-57) : Meme correction

Le reste du code (affichage, actions) reste identique car la structure des donnees fusionnees sera compatible avec `payout.recipient?.nom_complet`.
