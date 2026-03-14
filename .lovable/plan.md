

# Corriger l'authentification Africa's Talking (401)

## Diagnostic
Les logs les plus récents (05:36:59Z) montrent encore `401 The supplied authentication is invalid`. La mise à jour du secret a été faite mais la fonction utilise peut-être encore l'ancienne valeur en cache.

## Actions

### 1. Forcer le redéploiement de `phone-auth`
Redéployer la fonction Edge pour forcer la relecture des secrets. Aucun changement de code nécessaire — un simple redéploiement suffit à vider le cache des variables d'environnement.

### 2. Ajouter un log de diagnostic temporaire
Ajouter un log masqué des 8 premiers caractères de la clé API au démarrage de `sendSmsAfricasTalking` pour confirmer que la bonne clé est chargée :
```
console.log('[phone-auth] AT apiKey prefix:', apiKey?.substring(0, 8));
```

### 3. Si toujours 401
Le problème est côté Africa's Talking. Vérifier dans le dashboard AT :
- Que la clé API est bien celle de l'app **production** "Fere" (pas une clé sandbox)
- Que l'app est bien en mode **Live** et non **Sandbox**

