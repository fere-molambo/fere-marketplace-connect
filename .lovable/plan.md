

# Plan : Reduire le Cached Egress Supabase

## Diagnostic

Votre projet Supabase Free Plan a depasse le quota de **Cached Egress** (6.75 GB / 5 GB = 135%). Le "Cached Egress" correspond principalement au trafic des **images servies via le CDN de Supabase Storage** (logos boutiques, images produits, stories, avatars, etc.).

Deux problemes majeurs identifies dans le code :

### 1. React Query desactive tout cache (cause principale des requetes repetees)
```typescript
// App.tsx — configuration actuelle
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,    // ← Chaque donnee est "perimee" immediatement
      gcTime: 0,        // ← Le cache est vide en permanence
      refetchOnMount: true,
      refetchOnWindowFocus: true,  // ← Re-fetch a chaque focus de fenetre
    },
  },
});
```
Resultat : chaque navigation ou retour d'onglet relance TOUTES les requetes, y compris celles qui chargent des listes de produits/services contenant des URLs d'images. Le navigateur re-telecharge ensuite ces images depuis le CDN Supabase.

### 2. Cache-busters sur les URLs d'images
Certains fichiers ajoutent `?t=${Date.now()}` aux URLs publiques, ce qui force le CDN a renvoyer le fichier a chaque fois au lieu de servir depuis le cache navigateur.

### 3. `select("*")` partout
235 occurrences de `select("*")` : on recupere toutes les colonnes alors que souvent seuls quelques champs sont necessaires, ce qui augmente le volume de donnees transfere.

## Changements prevus

### Fichier 1 : `src/App.tsx`
Configurer React Query avec un cache raisonnable :
- `staleTime: 2 * 60 * 1000` (2 minutes) — les donnees restent "fraiches" 2 min
- `gcTime: 5 * 60 * 1000` (5 minutes) — le cache est conserve 5 min
- `refetchOnWindowFocus: false` — ne plus re-fetcher a chaque retour sur l'onglet

Cela reduit drastiquement le nombre de requetes API et donc le trafic CDN pour les images referees dans les reponses.

### Fichier 2 : `src/components/shops/ShopImageUpload.tsx`
Supprimer le `?t=${Date.now()}` cache-buster sur les URLs publiques. Utiliser `queryClient.invalidateQueries()` pour rafraichir les donnees apres upload.

### Fichier 3 : `src/components/shops/tabs/ConfigTab.tsx`
Meme correction : supprimer le cache-buster `?t=${Date.now()}`.

### Fichier 4 : Pages publiques les plus consultees
Optimiser les `select("*")` sur les pages a fort trafic pour ne recuperer que les colonnes necessaires :
- `src/pages/Home.tsx` / `ProductsServicesSection.tsx` — produits et services publics
- `src/pages/PublicShop.tsx` — boutique publique (produits, services, stories)
- `src/pages/ProductsServices.tsx` — catalogue

Par exemple, au lieu de `select("*")` sur `products`, selectionner uniquement `id, name, price, main_image, shop_id, category_id, ...` (les champs affiches).

## Impact estime

| Optimisation | Reduction estimee |
|---|---|
| Cache React Query (2 min stale) | ~50-60% de requetes en moins |
| Suppression cache-busters | ~10-15% de hits CDN en moins |
| Select specifique (pages publiques) | ~10-20% de volume par requete |
| **Total estime** | **~60-70% de reduction du cached egress** |

Avec 6.75 GB actuellement, cela devrait ramener l'usage autour de 2-3 GB, bien sous le quota de 5 GB.

## Details techniques

- Les donnees qui necessitent du temps reel (messages, statuts commandes) garderont des `staleTime` plus courts via des overrides locaux dans leurs hooks respectifs.
- Les mutations (creation/modification de produit, etc.) continueront a invalider le cache via `queryClient.invalidateQueries()`, donc les donnees seront toujours a jour apres une action utilisateur.
- Aucun changement de fonctionnalite visible pour l'utilisateur.

