## Constat

L’erreur visible n’est plus un problème de session mobile ni de WebView :

```text
OAuth token error: 401
invalid_client / Wrong password for client ...
```

Cela vient de l’authentification serveur vers Orange Money. La fonction appelle Orange OAuth avec `ORANGE_MONEY_AUTH_HEADER`, mais ce secret est invalide, mal encodé, ou ne correspond pas au bon environnement Orange Money.

## Plan de correction

1. **Corriger les secrets Orange Money**
   - Mettre à jour `ORANGE_MONEY_AUTH_HEADER` avec exactement :
     ```text
     Basic BASE64(client_id:client_secret)
     ```
   - S’assurer que `client_id`, `client_secret` et `merchant_key` viennent de la même application Orange Money et du même environnement que l’endpoint utilisé.

2. **Rendre la fonction plus robuste**
   - Modifier `orange-money-payment` pour reconstruire automatiquement le header Basic depuis `ORANGE_MONEY_CLIENT_ID` + `ORANGE_MONEY_CLIENT_SECRET` si `ORANGE_MONEY_AUTH_HEADER` est absent ou incorrect.
   - Ne jamais exposer les secrets dans les logs.
   - Améliorer le message d’erreur côté app : afficher “Configuration Orange Money invalide” au lieu de montrer le JSON brut OAuth.

3. **Vérifier l’environnement Orange Money**
   - La fonction utilise actuellement :
     - OAuth : `https://api.orange.com/oauth/v3/token`
     - WebPay Mali live : `/orange-money-webpay/ml/v1/...`
     - Devise : `XOF`
   - Confirmer que les identifiants Orange utilisés sont bien ceux de WebPay Mali live. Si ce sont des identifiants sandbox/dev, adapter l’endpoint et la devise selon l’environnement.

4. **Déployer et tester l’edge function**
   - Déployer `orange-money-payment`.
   - Tester d’abord l’action `get_token` pour vérifier que le token Orange est obtenu.
   - Ensuite tester un paiement mobile complet : initialisation → WebView Orange → retour HTTPS → vérification.

## Ce dont j’ai besoin de toi

Comme la valeur du secret est masquée, je peux corriger le code et ouvrir la demande de mise à jour sécurisée des secrets, mais tu devras entrer les valeurs Orange Money dans le formulaire sécurisé Lovable.

Valeurs à préparer depuis le portail Orange Developer :

```text
ORANGE_MONEY_CLIENT_ID
ORANGE_MONEY_CLIENT_SECRET
ORANGE_MONEY_MERCHANT_KEY
```

Et si tu veux garder `ORANGE_MONEY_AUTH_HEADER`, sa valeur doit être exactement :

```text
Basic <base64_de_CLIENT_ID:CLIENT_SECRET>
```