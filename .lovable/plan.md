## Objectif

Le paiement Orange Money fonctionne maintenant. Ajout de logs structurés et non sensibles dans `supabase/functions/orange-money-payment/index.ts` pour faciliter le diagnostic en cas de problème futur, sans modifier le comportement.

## Changements

1. **Log d'entrée enrichi** : action, payment_type, amount, related_id, présence des URLs, origin, user-agent (au lieu du dump complet du body qui peut contenir des données checkout volumineuses).

2. **OAuth (`getAccessToken`)** :
   - Log quand un token caché est réutilisé.
   - Log du préfixe (`Basic`) et de la longueur de `ORANGE_MONEY_AUTH_HEADER` sans jamais logger sa valeur.
   - En cas d'échec OAuth : log structuré `http_status` + `error` + `error_description` + `message`.

3. **WebPay initialize** :
   - Log avant l'appel : order_id, amount, currency, longueurs des URLs (return/cancel/notif) — utile car Orange impose 120 chars max.
   - Log après l'appel : `http_status`, présence de `payment_url`/`pay_token`/`notif_token`, plus `message`/`description`/`code` retournés par Orange.
   - Log explicite en cas d'échec avec order_id, user_id, payment_type, amount.
   - Log de succès avec order_id, user_id, payment_type.

4. **Verify** :
   - Log de début avec order_id et présence du pay_token.
   - Log de réponse Orange structuré (`http_status`, `om_status`, `txnid`, `message`).

5. **Erreur globale** : ajout du `stack` dans le `catch` racine.

## Ce qui ne change PAS

- Aucune logique métier modifiée.
- Aucun secret, pay_token complet, notif_token ou access_token n'est logué.
- Format des réponses HTTP identique.
- Pas de migration DB, pas de changement frontend, pas de changement mobile.

Aucun rebuild d'APK Bolt n'est nécessaire — la fonction est redéployée automatiquement après l'édition.