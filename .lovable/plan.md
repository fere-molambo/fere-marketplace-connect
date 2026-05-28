## Forcer return_url / cancel_url HTTPS pour Orange Money

### Problème
Le mobile envoie `return_url: fere://payment/callback?...` (deep link). Orange Money répond `400 Invalid body field — only http and https are accepted` (code 24).

### Changement
Dans `supabase/functions/orange-money-payment/index.ts`, fonction `handleInitialize` (lignes ~270-278) :

1. Détecter si `return_url` / `cancel_url` reçus commencent par `http://` ou `https://`.
2. Sinon (deep link comme `fere://`), les remplacer par des URLs HTTPS canoniques :
   - `https://jajfuajmkjulujnwfqen.lovable.app/payment/callback?ref={orderId}`
   - `https://jajfuajmkjulujnwfqen.lovable.app/checkout`
3. Logger le scheme original pour diagnostic (sans exposer la valeur complète).
4. Les URLs `https://` existantes passent telles quelles.

### Comportement mobile
Le WebView intercepte déjà les URLs HTTPS via `onNavigationStateChange` — la sanitisation côté serveur n'affecte que ce qui est envoyé à Orange, pas la détection client.

### Test
- Redéployer
- Vérifier les logs : `WebPay response` doit retourner `http_status: 200` avec `payment_url` présent
- Tester un checkout mobile complet

### Portée
- 1 fichier modifié : `supabase/functions/orange-money-payment/index.ts`
- Aucun changement DB, frontend, mobile