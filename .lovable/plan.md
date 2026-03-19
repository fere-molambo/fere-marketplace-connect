

# Nettoyer les données résiduelles des comptes test supprimés

## Données à supprimer

1. **`pending_registrations`** : 1 entrée orpheline (montcho, phone +2230777992271, email montchovideme@gmail.com)
2. **`login_attempts`** : 1 entrée orpheline (phone +2250777992271)
3. **`otp_rate_limits`** : 6 entrées de test (divers numéros)

## Ce qui est conservé (pas touché)

- Tous les profils admin/super_admin (4 comptes)
- Le livreur vivi (637bd145) + son `user_pins`
- Toutes les autres tables (aucune donnée orpheline détectée)

## Méthode

Exécuter 3 requêtes DELETE via l'outil d'insertion Supabase :

```sql
DELETE FROM pending_registrations;
DELETE FROM login_attempts;
DELETE FROM otp_rate_limits;
```

Ces tables ne contiennent que des données temporaires/de session — les vider entièrement est sans risque.

## Fichiers modifiés

Aucun fichier de code modifié. Uniquement des opérations de nettoyage en base de données.

