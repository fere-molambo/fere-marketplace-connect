

# Changement de rôle des utilisateurs par le Super Admin

## Fonctionnalité

Ajouter un sélecteur de rôle dans le formulaire `UserEditSheet` permettant au super_admin de changer le rôle d'un utilisateur. Le changement remplacera le(s) rôle(s) existant(s) par le nouveau rôle sélectionné.

## Plan d'implémentation

### 1. Modifier `UserEditSheet.tsx`

- Ajouter un état `selectedRole` initialisé avec le rôle actuel de l'utilisateur
- Ajouter un `Select` dropdown après le champ Email, visible uniquement pour le super_admin
- Options : super_admin, admin, vendeur, livreur, membre, equipe
- Empêcher le super_admin de changer son propre rôle
- Dans `onSubmit`, si le rôle a changé :
  - Supprimer l'ancien rôle via `DELETE FROM user_roles WHERE user_id = ...`
  - Insérer le nouveau rôle via `INSERT INTO user_roles`
  - Invalider le cache `user-roles`

### 2. RLS

Les politiques existantes sur `user_roles` doivent permettre au super_admin de modifier les rôles. Vérification nécessaire — si la table n'a pas de policy ALL pour super_admin, une migration sera ajoutée.

### Section technique

Modifications dans un seul fichier : `src/components/users/UserEditSheet.tsx`
- Ajout d'un `Select` avec les 6 rôles disponibles
- Logique de mise à jour : delete ancien + insert nouveau dans `user_roles`
- Condition : `isSuperAdmin && currentUser?.id !== user?.id`

