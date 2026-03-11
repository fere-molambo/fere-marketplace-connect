

# Ajout de l'export Excel (XLSX) pour Paiements et Transactions

## Constat
- La page **Paiements** (`/dashboard/payments`) a deja un export CSV par onglet (en attente, effectues, remboursements).
- La page **Transactions** (`/dashboard/transactions`) n'a **aucun export**.
- Le format demande est **Excel (.xlsx)**, pas seulement CSV.

## Plan

### 1. Ajouter la librairie `xlsx` (SheetJS)
Installer `xlsx` pour generer de vrais fichiers `.xlsx` compatibles Excel.

### 2. Creer une fonction utilitaire `exportToExcel`
Dans `src/components/payments/paymentUtils.ts`, ajouter une fonction `exportToExcel(rows, filename)` qui :
- Cree un workbook avec un worksheet a partir des donnees
- Telecharge le fichier `.xlsx`

### 3. Modifier la page Paiements
- Ajouter un bouton "Exporter Excel" a cote du bouton CSV existant dans chaque onglet (en attente, effectues, remboursements), ou remplacer le CSV par Excel selon preference.

### 4. Ajouter l'export a la page Transactions
- Ajouter un bouton "Exporter Excel" dans la zone de filtres de `src/pages/Transactions.tsx`
- Exporter les transactions filtrees avec colonnes : Date, Reference, Type, Client, Contact, Montant, Devise, Statut

## Fichiers modifies
- `package.json` : ajout de `xlsx`
- `src/components/payments/paymentUtils.ts` : ajout `exportToExcel`
- `src/pages/Payments.tsx` : ajout boutons Excel par onglet
- `src/pages/Transactions.tsx` : ajout bouton Export Excel

