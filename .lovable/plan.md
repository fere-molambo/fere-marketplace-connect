## Plan : sécuriser le .env

### Constat
Le `.env` actuel ne contient que des valeurs **publiques et sans risque** :
- `VITE_SUPABASE_PROJECT_ID` — identifiant public du projet
- `VITE_SUPABASE_PUBLISHABLE_KEY` — clé `anon` Supabase (conçue pour être exposée côté client, protégée par RLS)
- `VITE_SUPABASE_URL` — URL publique du projet

Aucun secret sensible (`SERVICE_ROLE_KEY`, clés Orange Money, Ikoddi, etc.) n'est dans ce fichier — ils vivent uniquement dans les Edge Function Secrets Supabase.

**Conclusion :** pas besoin de faire tourner les clés. Mais par hygiène, on évite que `.env` continue d'être commité.

### Actions recommandées

1. **Ajouter `.env` au `.gitignore`** (et `.env.local`, `.env.*.local` par précaution)
   - Empêche tout futur commit accidentel si un secret y est ajouté un jour.
   - L'historique Git reste inchangé — mais comme les valeurs sont publiques, ce n'est pas un problème.

2. **Créer un `.env.example`** avec les noms de variables sans valeurs
   - Sert de référence pour les nouveaux contributeurs / clones du repo.
   - Contenu :
     ```
     VITE_SUPABASE_PROJECT_ID=""
     VITE_SUPABASE_PUBLISHABLE_KEY=""
     VITE_SUPABASE_URL=""
     ```

3. **Garder le `.env` local** — Lovable a besoin de ces variables pour faire tourner l'app dans le preview. On ne le supprime pas, on l'ignore juste pour les futurs commits.

### Ce qu'on ne fait PAS
- Pas de rotation de la clé anon (inutile, elle est publique par design)
- Pas de `git rm --cached .env` ni de réécriture d'historique (les valeurs sont publiques, donc sans intérêt)
- Pas de modification des Edge Function Secrets (ils sont déjà sécurisés)

### Détails techniques
Modifications à apporter :
- `/.gitignore` : ajouter les lignes `.env`, `.env.local`, `.env.*.local`
- `/.env.example` : nouveau fichier avec les noms de variables (valeurs vides)

Aucun changement de code applicatif, aucune migration DB, aucun redéploiement d'edge function.
