## Diagnostic confirmé

Bolt se trompe. Notre edge function utilise déjà les bonnes URLs `/ml/v1/` (prod Mali) — pas `/dev/v1/`. La cause réelle est visible dans les auth logs Supabase (11:05:03):

```
status: 403
error_code: bad_jwt
msg: "invalid claim: missing sub claim"
```

L'app Android envoie un token sans claim `sub` — probablement l'anon key au lieu du JWT de session utilisateur, ou un token vide/expiré non rafraîchi avant l'appel. iOS fonctionne car la session est valide.

## Plan

### 1. Améliorer les logs auth dans `orange-money-payment/index.ts`

Avant l'appel `auth.getUser(token)`, logger (sans exposer le token complet):
- présence du header `Authorization`
- longueur du token
- 8 premiers caractères du token (assez pour distinguer anon key vs JWT utilisateur)
- nombre de segments (`.split('.').length` — un JWT valide = 3)
- décodage du payload (sans vérif) pour exposer: `sub` présent ou non, `role`, `exp` (expiré ou non), `iss`

Après l'appel:
- message d'erreur exact de Supabase
- code d'erreur

Ces logs permettront de confirmer immédiatement, au prochain essai Android, si:
- aucun token n'est envoyé,
- l'anon key est envoyée (role: "anon", pas de sub),
- un JWT utilisateur expiré est envoyé (sub présent, exp dépassé),
- un JWT malformé est envoyé.

Aucun secret/token complet n'est loggé — seulement préfixe + métadonnées du payload.

### 2. Message prêt à coller dans Bolt (sera fourni après implémentation)

Texte expliquant:
- les URLs sont déjà `/ml/v1/` côté backend, pas besoin d'y toucher
- la vraie cause est côté app Android: la session Supabase envoyée à `supabase.functions.invoke(...)` est invalide (bad_jwt, missing sub)
- ce qu'il faut vérifier dans l'app Android (await `supabase.auth.getSession()` + refresh avant l'appel, vérifier que `supabase-js` est bien initialisé avec l'anon key correcte, ne PAS surcharger manuellement le header Authorization avec l'anon key)

### Aucun changement

- Pas de migration DB
- Pas de changement frontend web
- Pas de changement de logique métier
- Pas de modification des URLs Orange (déjà correctes)
- Aucun rebuild APK nécessaire côté Lovable

### Fichier modifié

- `supabase/functions/orange-money-payment/index.ts` (ajout de logs uniquement, ~15 lignes)
