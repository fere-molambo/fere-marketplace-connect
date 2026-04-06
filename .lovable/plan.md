

# Plan : Corriger le crash de l'edge function phone-auth

## Probleme

L'edge function `phone-auth` crash au demarrage (boot → shutdown sans traiter aucune requete). Les logs montrent uniquement des cycles boot/shutdown sans aucun log applicatif (`[phone-auth] Request received` n'apparait jamais). Cela indique un echec lors de l'import ou de l'initialisation.

**Cause probable** : les imports utilisent des URLs flottantes (`https://esm.sh/@supabase/supabase-js@2`) qui peuvent resoudre vers une version incompatible avec l'edge runtime, ou `serve` de `deno.land/std@0.168.0` est devenu incompatible.

## Solution

Mettre a jour `supabase/functions/phone-auth/index.ts` pour utiliser les imports stables recommandes :

1. **Remplacer l'import `serve`** : utiliser `Deno.serve` natif au lieu de `serve` de `deno.land/std`
2. **Remplacer l'import supabase** : utiliser `npm:@supabase/supabase-js@2` au lieu de `esm.sh`

### Changements concrets

```typescript
// AVANT (ligne 1-2)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// APRES
import { createClient } from "npm:@supabase/supabase-js@2";
```

```typescript
// AVANT (ligne 156)
serve(async (req) => {

// APRES
Deno.serve(async (req) => {
```

3. **Appliquer les memes corrections aux autres edge functions** qui utilisent le meme pattern (verifier et corriger en batch).

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `supabase/functions/phone-auth/index.ts` | Imports modernes + Deno.serve |
| Potentiellement les autres edge functions | Meme pattern d'import si elles ont le meme probleme |

## Impact

Aucun changement de logique metier. Seuls les imports et le point d'entree sont mis a jour pour etre compatibles avec le runtime actuel.

