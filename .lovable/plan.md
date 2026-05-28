## Option 2 — Page de rebond HTML avec deep link

### Sécurité — vérifiée
- La page reçoit uniquement `ref` (= `order_id` Orange Money) dans l'URL. Aucun secret, aucun token, aucun montant.
- Le deep link `fere://payment/callback?ref=...` ne contient que cette référence publique.
- La vérification réelle du paiement (`action: verify`) reste côté app mobile et exige :
  - le `pay_token` stocké en `AsyncStorage` (jamais exposé dans l'URL)
  - la session Supabase authentifiée du client
- Un attaquant qui forgerait un deep link `fere://payment/callback?ref=XXX` ne peut rien faire : sans le `pay_token` local + session, le `verify` échoue côté edge function.
- ✅ Aucune élévation de privilège possible.

### Changements

**1 fichier modifié** — `supabase/functions/orange-money-payment/index.ts`

Dans `handleInitialize`, remplacer le `return_url` HTTPS canonique actuel par une URL pointant vers une page de rebond dédiée :

```
https://jajfuajmkjulujnwfqen.lovable.app/payment/return?ref={orderId}
```

(au lieu de `/payment/callback?ref={orderId}`)

Le `cancel_url` devient `/payment/return?ref={orderId}&cancel=1`.

**1 fichier créé** — `public/payment/return.html` (page statique, hors React, ultra-légère)

Contenu :
- Récupère `?ref=...` et `?cancel=...` depuis l'URL
- Affiche un message "Paiement traité, retour à l'application…"
- Exécute immédiatement `window.location.href = "fere://payment/callback?ref=" + ref` (ou `fere://checkout?cancel=1`)
- Fallback après 3 s : bouton "Retour à Fere" qui re-tente le deep link
- Aucun JS Supabase, aucun appel API, aucune dépendance — purement statique

### Comportement final

- **Web (navigateur normal)** : utilisateur arrive sur `/payment/return?ref=...` → le deep link `fere://` échoue silencieusement → bouton fallback visible. On peut aussi ajouter une redirection JS vers `/payment/callback?ref=...` après 3 s pour conserver le flux web React existant.
- **Mobile (WebView Orange Money)** : navigateur tente `fere://payment/callback?ref=...` → iOS/Android intercepte et ouvre l'app native Fere → l'app récupère `ref` (deep link handler existant déjà côté Bolt) et lance la vérification avec `pay_token` stocké.

### Portée
- 1 edge function modifiée (2 lignes : URLs)
- 1 fichier HTML statique ajouté dans `public/`
- 0 changement DB, 0 changement React, 0 changement Bolt
- Aucun impact sur le flux web actuel (sera juste redirigé via la page de rebond, transparent)

### Test
- Web : checkout depuis navigateur → page rebond → redirection vers `/payment/callback` → vérification normale
- Mobile : checkout depuis app → WebView OM → clic "revenir au site marchand" → page rebond → app native s'ouvre via deep link
