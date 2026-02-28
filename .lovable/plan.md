

# Fix: Simplifier la creation de boutique pour les vendeurs

## Probleme
Le formulaire de creation de boutique montre le champ "Proprietaire (Vendeur)" a tous les utilisateurs, y compris les vendeurs. Un vendeur ne devrait pas choisir un proprietaire — il EST le proprietaire. Seuls les admins/super_admins doivent pouvoir assigner un proprietaire different.

## Changements — `src/components/shops/CreateShopDialog.tsx`

### 1. Schema Zod conditionnel
Rendre `owner_id` optionnel dans le schema (il sera auto-rempli pour les vendeurs).

### 2. Auto-set owner_id pour les vendeurs
- Si l'utilisateur n'est PAS admin/super_admin : `owner_id = user.id` automatiquement, le champ est masque
- Si l'utilisateur EST admin/super_admin : le selecteur de proprietaire reste visible

### 3. Verification status pour vendeurs
- Vendeur qui cree sa propre boutique : `verification_status = "pending"` (l'admin doit valider)
- Admin qui cree une boutique : `verification_status = "verified"` (comme actuellement)

### 4. Masquer les champs admin-only
Le champ "Proprietaire", "Zone de livraison", et tout le bloc "Parametres Admin" restent visibles uniquement pour admin/super_admin. Le vendeur voit seulement :
- Nom de la boutique
- Type (fournisseur / prestataire / les deux)

### 5. Query vendors uniquement pour admins
Ne charger la liste des vendeurs que si `isSuperAdmin || isAdmin`.

