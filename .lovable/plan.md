

# Repartir de zéro avec le numéro +2250777992271

## Etat actuel

- L'utilisateur "themis" a bien été supprimé (aucune trace dans `auth.users`, `profiles`, `user_pins`)
- Le code `create-user` est déjà correct : pour les rôles phone-based, il crée un email fictif, un UUID `internal_password`, et insère le PIN hashé dans `user_pins`
- Le formulaire `CreateUserDialog` est adaptatif (PIN pour les rôles mobiles, mot de passe pour admin)
- **Données parasites restantes** : `login_attempts` (6 tentatives) et `otp_rate_limits` pour ce numéro

## Actions

### 1. Migration SQL : nettoyer les données résiduelles
Supprimer les entrées dans `login_attempts` et `otp_rate_limits` pour `+2250777992271` afin d'éviter tout blocage.

### 2. Redéployer les edge functions
S'assurer que `create-user` et `phone-auth` sont à jour avec le dernier code (fictive email + PIN hash).

### 3. Test de bout en bout
Après déploiement :
1. Créer un utilisateur "membre" depuis le dashboard `/dashboard/users` avec le numéro `+2250777992271` et un PIN à 6 chiffres
2. Se connecter avec ce numéro et ce PIN depuis la page de login

## Fichiers impactés

| Fichier | Action |
|---|---|
| Migration SQL | Nettoyer login_attempts + otp_rate_limits |
| Edge functions | Redéployer create-user et phone-auth |

