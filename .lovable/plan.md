

# Plan : Nettoyage profil client/livreur + suppression paramètre cash

## 1. Migration base de donnees

Supprimer les 4 colonnes de la table `profiles` :
- `sexe`
- `tranche_age`
- `statut_matrimonial`
- `statut_professionnel`

Supprimer les 4 types enum associes :
- `client_sexe`
- `client_tranche_age`
- `client_statut_matrimonial`
- `client_statut_professionnel`

Supprimer la colonne `max_cash_order_amount` de la table `platform_settings`.

## 2. Frontend : `src/pages/ClientProfile.tsx`

Supprimer les 4 blocs de formulaire Select (lignes 434-505) pour sexe, tranche d'age, statut matrimonial et statut professionnel.

## 3. Frontend : `src/components/settings/FinancialPoliciesSettings.tsx`

- Supprimer le state `maxCashAmount` et son setter
- Retirer `max_cash_order_amount` du query select et de l'update
- Supprimer toute la Card "Paiement cash" (le bloc avec le montant maximum et l'avertissement jaune)

## Details techniques

Fichiers modifies :
- **Migration SQL** : DROP columns + DROP types
- **`src/pages/ClientProfile.tsx`** : Retrait des 4 champs Select
- **`src/components/settings/FinancialPoliciesSettings.tsx`** : Retrait de la card cash et du state associe

Le fichier `types.ts` se mettra a jour automatiquement apres la migration.

