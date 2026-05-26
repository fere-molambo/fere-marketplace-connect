## Ce que je vais faire côté edge function (auto-déployé Lovable)

**Fichier**: `supabase/functions/orange-money-payment/index.ts`

### 1. Lecture défensive de `payment_type`
Actuellement on ne lit que `body.payment_type`. Si Bolt l'envoie par erreur dans `metadata.payment_type`, on échoue avec 400. Je vais accepter les deux emplacements :

```ts
const payment_type = body.payment_type ?? body?.metadata?.payment_type ?? null;
```

Idem pour `return_url` et `cancel_url` (fallback sur `metadata.return_url` / `metadata.cancel_url`). Comme ça, même si le bundle mobile envoie le payload sous une forme légèrement différente, ça marche.

### 2. Logging enrichi à l'entrée
Pour qu'on sache exactement ce que le mobile envoie à chaque appel :

```ts
console.log('[orange-money] Request received', JSON.stringify({
  action: body?.action,
  payment_type_top: body?.payment_type ?? null,
  payment_type_meta: body?.metadata?.payment_type ?? null,
  body_keys: Object.keys(body || {}),
  metadata_keys: Object.keys(body?.metadata || {}),
  has_return_url_top: !!body?.return_url,
  has_return_url_meta: !!body?.metadata?.return_url,
  has_cancel_url_top: !!body?.cancel_url,
  has_cancel_url_meta: !!body?.metadata?.cancel_url,
  amount: body?.amount,
  related_id: body?.related_id,
  user_agent: req.headers.get('user-agent') || null,
  app_version: req.headers.get('x-app-version') || null,
}));
```

Ça me permettra dès ton prochain test de te dire **précisément** ce que ton APK envoie, et donc si le rebuild Bolt a bien pris.

### 3. Rien d'autre à toucher
- La validation `payment_type` reste (sinon paiement orphelin chez Orange).
- L'auto-détection webhook Orange reste.
- Le calcul `balance_amount` côté serveur reste.
- Frontend web : aucun changement.

---

## Message UNIQUE et FINAL à envoyer à Bolt

> J'ai fait les derniers ajustements côté edge function Supabase :
> 1. **Lecture défensive** : `payment_type`, `return_url` et `cancel_url` sont maintenant acceptés soit au top-level du `body`, soit dans `metadata`. Tu n'as plus besoin de stresser sur l'emplacement exact.
> 2. **Logging enrichi** : à chaque appel je logue les clés exactes du body et l'emplacement de chaque champ, le `user-agent`, et un éventuel header `x-app-version`. Ça me permettra de confirmer en 10 secondes si le nouveau bundle est bien actif sur le téléphone après rebuild.
>
> **De ton côté, plus rien à changer si ton code mobile est conforme à ceci** (vérifie ces 4 points dans le repo avant que je télécharge et build) :
>
> **A) `app.json`** déclare le scheme et les intent filters :
> ```json
> {
>   "expo": {
>     "scheme": "fere",
>     "android": {
>       "intentFilters": [
>         { "action": "VIEW",
>           "data": [{ "scheme": "fere", "host": "payment" }],
>           "category": ["BROWSABLE", "DEFAULT"] }
>       ]
>     }
>   }
> }
> ```
>
> **B) Le WebView de paiement** utilise **`onShouldStartLoadWithRequest`** (obligatoire, pas seulement `onNavigationStateChange`) pour intercepter `fere://payment/callback` et `fere://payment/cancel` AVANT qu'Android n'essaie de les charger comme URL web :
> ```tsx
> <WebView
>   source={{ uri: paymentUrl }}
>   onShouldStartLoadWithRequest={(req) => {
>     if (req.url.startsWith('fere://payment/callback')) { verifyAndClose(); return false; }
>     if (req.url.startsWith('fere://payment/cancel'))   { cancelAndClose(); return false; }
>     return true;
>   }}
>   onNavigationStateChange={(nav) => {
>     if (nav.url.startsWith('fere://payment/callback')) verifyAndClose();
>     if (nav.url.startsWith('fere://payment/cancel'))   cancelAndClose();
>   }}
> />
> ```
>
> **C) L'appel `initialize`** envoie au top-level : `action: 'initialize'`, `amount`, `email`, `payment_type` (`'order'` | `'order_balance'` | `'service_booking'` | `'tokens'`), `related_id`, `return_url: 'fere://payment/callback'`, `cancel_url: 'fere://payment/cancel'`. Même chose pour tous les flows (acompte, solde, réservation service) — seul `payment_type` + `related_id` changent.
>
> **D) `verifyAndClose()`** lit `om_order_id` + `om_pay_token` depuis AsyncStorage, appelle `orange-money-payment` avec `action: 'verify'`, puis ferme le WebView et clear AsyncStorage.
>
> **E) (bonus)** Ajoute un header HTTP `x-app-version` (par ex. le `versionCode`) sur l'appel `initialize` pour que je puisse confirmer la version exacte qui tourne sur le téléphone.
>
> **Incrémente `expo.android.versionCode`** avant de pousser, sinon Google Play refuse l'upload.
>
> Une fois ces 5 points confirmés dans le repo, plus besoin de discussion : tu pousses, l'utilisateur build, upload sur Play Console, teste. Je regarderai les logs en parallèle du test et je dirai immédiatement si c'est OK ou ce qui manque.

---

## Ce que toi (utilisateur) tu fais après mon implémentation

1. Demande à Bolt de confirmer les 5 points A–E ci-dessus.
2. Une fois confirmé : `git pull` dans Cursor → `npm install` → `eas build --platform android --profile production` → upload `.aab` sur Play Console Test fermé → publie release → mets à jour l'app sur ton téléphone.
3. Tente un paiement réel.
4. Reviens me voir avec un simple "j'ai testé" — je consulterai les logs Supabase et te dirai si ça passe, et si non, exactement ce qui manque.
