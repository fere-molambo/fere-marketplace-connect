## Contexte

Bolt a corrigé le côté mobile (rebuild APK requis). Les logs récents révèlent 2 bugs côté **edge function** que Bolt ne peut pas corriger :

### Bug A — Insert `payment_transactions` échoue (NOT NULL `payment_type`)
Logs : `null value in column "payment_type" of relation "payment_transactions" violates not-null constraint`

Le mobile envoie l'`initialize` **sans `payment_type`** dans le body. L'edge function appelle quand même Orange Money avec succès (WebPay OK), puis crash sur l'INSERT. Résultat : le paiement est créé chez Orange mais aucun enregistrement en base → impossible de vérifier ensuite.

**Correction** : valider `payment_type` AVANT d'appeler Orange Money, retourner 400 explicite si manquant.

### Bug B — Webhook Orange Money rejeté (`mpayment http client`)
Logs : requêtes `user_agent: "mpayment http client"` → `Error: Invalid action`

Orange Money envoie son webhook sur `notif_url` **sans champ `action`** (juste `{ status, notif_token, txnid }`). Le routeur exige `action: 'webhook'` et rejette.

**Correction** : détecter le webhook par sa signature (présence de `notif_token` + `txnid` + absence d'`action`, et/ou par user-agent `mpayment http client`) et router vers `handleWebhook` automatiquement.

---

## Plan

### Fichier unique : `supabase/functions/orange-money-payment/index.ts`

**1. Auto-détection du webhook Orange (lignes ~36-48)**
```ts
const { action } = body;
const isOrangeWebhook = !action && body?.notif_token && body?.txnid;

if (isOrangeWebhook || action === 'webhook') {
  return await handleWebhook(supabaseClient, body);
} else if (action === 'get_token') { ... }
// etc.
```

**2. Validation `payment_type` en début de `handleInitialize` (avant ligne 184)**
```ts
const validTypes = ['order', 'order_balance', 'service_booking', 'tokens', 'subscription', 'commission_payout'];
if (!payment_type || !validTypes.includes(payment_type)) {
  throw new Error(`payment_type is required and must be one of: ${validTypes.join(', ')}`);
}
```

**3. Log d'erreur plus visible si l'INSERT échoue** (ligne 316) — déjà loggé, ajouter aussi une remontée d'erreur HTTP au client pour qu'il sache que la transaction est orpheline.

---

## Hors scope

- Pas de migration DB (la contrainte NOT NULL est correcte, c'est le client qui doit envoyer le champ).
- Pas de changement frontend web (le checkout web envoie déjà `payment_type` correctement).
- Pas de rebuild Bolt nécessaire pour ces fixes (mais Bolt doit **aussi** envoyer `payment_type` dans tous ses appels `initialize` — voir message ci-dessous).

---

## Message à renvoyer à Bolt après le patch

> J'ai corrigé 2 bugs côté edge function :
> 1. **Webhook Orange Money** auto-détecté (plus besoin d'`action: webhook`)
> 2. **Validation `payment_type`** : si manquant, l'edge function retourne maintenant 400 explicite au lieu de créer un paiement orphelin chez Orange.
>
> ⚠️ **Action requise côté app mobile** : vérifie que **tous** tes appels `supabase.functions.invoke('orange-money-payment', { body: { action: 'initialize', ... } })` incluent bien `payment_type` (valeurs valides : `order`, `order_balance`, `service_booking`, `tokens`, `subscription`, `commission_payout`). Les logs montrent qu'au moins un appel `initialize` est parti sans ce champ → le paiement réussissait chez Orange mais n'était jamais enregistré en base, rendant la vérification impossible.

---

## Validation après déploiement

1. Tester un paiement depuis l'APK reconstruite avec les fixes Bolt.
2. Vérifier dans les logs :
   - `Request received` contient `payment_type: "order"` (ou autre)
   - Pas d'`Insert error: null value in column "payment_type"`
   - Le webhook Orange (`mpayment http client`) est routé vers `handleWebhook` au lieu de `Invalid action`
3. Vérifier en base que `payment_transactions` est créée avec `status: 'pending'` puis passe à `success` via webhook.