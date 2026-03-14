

# Suppression des enregistrements dans pending_registrations

## Ce qui sera fait

Exécuter une requête SQL pour vider la table `pending_registrations` :

```sql
DELETE FROM pending_registrations;
```

Cela supprimera les 5 enregistrements existants (inscriptions expirées ou de test).

