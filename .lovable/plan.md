

# Amelioration de la page Paiements

## Probleme du bouton desactive

Le bouton "Marquer paye" est grise car les paiements ont un delai d'eligibilite de 24h (`payout_delay_hours` dans `platform_settings`). Les 4 paiements ont ete crees le 13/02 vers 22h et ne seront eligibles que le 14/02 vers 22h. C'est le comportement voulu -- le bouton s'activera automatiquement une fois la date atteinte. **Aucun bug a corriger ici.**

## Modifications prevues

### 1. Differencier visuellement Vendeur / Livreur

Remplacer les badges identiques par des couleurs distinctes :
- **Vendeur** : badge violet (bg-purple-50, text-purple-700, border-purple-200)
- **Livreur** : badge bleu (bg-blue-50, text-blue-700, border-blue-200)

Applique sur les onglets "En attente" et "Effectues".

### 2. Filtres par type + selection groupee + paiement en masse

Ajouter au-dessus du tableau "En attente" :
- Un filtre par type : "Tous", "Vendeurs", "Livreurs"
- Une checkbox "Tout selectionner" dans l'en-tete du tableau
- Des checkboxes individuelles par ligne
- Un bouton "Payer la selection (N)" qui apparait quand des lignes eligibles sont cochees
- Le paiement en masse met a jour tous les payouts selectionnes en une seule operation

### 3. Filtres par periode + export CSV

Ajouter une barre de filtres avec :
- Un selecteur de periode : "Aujourd'hui", "Cette semaine", "Ce mois", "Personnalise"
- Pour "Personnalise", deux champs date (debut/fin)
- Un bouton "Exporter CSV" qui genere et telecharge un fichier .csv avec les colonnes : Beneficiaire, Contact, Type, Reference, Montant, Date, Statut

Ces filtres s'appliquent aux onglets "En attente", "Effectues" et "Remboursements".

### 4. Optimisation responsive (tablette et mobile)

- Utiliser `overflow-x-auto` sur les conteneurs de tableaux
- Sur mobile (< 768px), masquer les colonnes secondaires (Reference, Eligible le) et les afficher dans un sous-bloc sous le nom du beneficiaire
- Rendre les TabsList scrollables horizontalement sur mobile
- Rendre les stat cards en grille 1 colonne sur mobile, 2 sur tablette, 3 sur desktop
- Adapter les boutons d'action en icones seules sur mobile

## Fichier modifie

**`src/pages/Payments.tsx`** : toutes les modifications ci-dessus dans ce seul fichier (filtres, selection, export, badges, responsive).

## Details techniques

```text
Structure des filtres :
  - typeFilter: "all" | "vendor" | "driver"
  - periodFilter: "today" | "week" | "month" | "custom"
  - customDateRange: { from: Date, to: Date }
  - selectedIds: Set<string>

Export CSV :
  - Generation cote client via Blob + URL.createObjectURL
  - Separateur point-virgule (compatible Excel FR)
  - Encodage UTF-8 avec BOM

Selection en masse :
  - Checkbox header selectionne/deselectionne tous les eligibles visibles
  - handleBulkPay() itere sur selectedIds et met a jour chaque payout
  - Invalidation des queries apres traitement
```

