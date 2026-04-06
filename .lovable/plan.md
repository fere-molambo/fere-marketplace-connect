
But

Corriger la vraie cause du message générique sur le web, et donner la même correction à Bolt pour le mobile.

Diagnostic confirmé

- `phone-auth` ne plante plus.
- Les logs montrent qu’elle reçoit bien les requêtes et renvoie des erreurs métier normales (`Identifiants incorrects`, blocage temporaire, etc.).
- Le problème actuel est côté client : tous les appels à `supabase.functions.invoke("phone-auth")` font `throw new Error(error.message)`. Quand Supabase renvoie une erreur HTTP 4xx/5xx, `error.message` devient seulement `Edge Function returned a non-2xx status code`, donc le vrai message backend est perdu.
- Sur la capture, le numéro saisi semble incomplet, donc le dernier échec visible est cohérent avec une vraie erreur d’identifiants, pas avec un crash serveur.

Plan d’implémentation

1. Centraliser le parsing des erreurs d’Edge Functions
- Ajouter un helper commun (ex. `src/lib/parseFunctionError.ts`).
- Gérer `FunctionsHttpError` et lire `await error.context.json()`.
- Extraire proprement `message`, `error`, `reason`, `remaining_seconds`, `support_phone`, `support_email`.
- Prévoir un fallback clair pour `FunctionsRelayError` / `FunctionsFetchError`.

2. Corriger tous les appels `phone-auth` côté web
- `src/hooks/useAuth.tsx` : login PIN
- `src/components/auth/PhoneSignupForm.tsx` : register, verify-registration, resend
- `src/components/auth/ResetPinFlow.tsx` : reset PIN
- `src/components/auth/RequestAdminResetDialog.tsx` : demande admin
- Remplacer partout la logique actuelle par le helper commun pour enfin afficher les vrais messages backend.

3. Améliorer légèrement l’UX du champ téléphone
- Empêcher les envois manifestement incomplets, ou au minimum afficher une validation plus claire avant l’appel backend.
- Cela évitera les faux “bugs” quand le numéro saisi ne correspond pas au compte réel.

4. Corriger aussi l’instruction mobile/Bolt
- Le mobile doit appliquer exactement le même parsing d’erreur.
- Aucun changement backend supplémentaire n’est prioritaire : l’API renvoie déjà les bonnes infos, c’est leur affichage qui est mauvais.

Prompt Bolt.new

“Corrigez la gestion des erreurs pour tous les appels à `supabase.functions.invoke("phone-auth")`. N’affichez plus `error.message` brut quand Supabase renvoie une erreur HTTP. Si l’erreur est une `FunctionsHttpError`, lisez `await error.context.json()` et affichez `payload.message || payload.error`. Gérez aussi explicitement `403` (compte suspendu) et `429` (compte temporairement bloqué avec `remaining_seconds`). Appliquez cela au login, à l’inscription OTP, au reset PIN et à la demande admin. Ne changez pas l’API backend ; corrigez seulement le parsing et l’affichage des erreurs.”

Détails techniques

- Fichiers concernés : `src/hooks/useAuth.tsx`, `src/components/auth/PhoneSignupForm.tsx`, `src/components/auth/ResetPinFlow.tsx`, `src/components/auth/RequestAdminResetDialog.tsx`, plus un helper commun.
- Le dernier diagnostic invalide l’hypothèse d’un crash de la fonction : la vraie panne visible pour l’utilisateur est l’affichage d’erreur trop générique.
- Vérifications à faire après implémentation : login invalide, compte bloqué, compte suspendu, inscription avec numéro déjà utilisé, OTP invalide, login valide.
