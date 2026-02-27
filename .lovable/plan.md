

# Plan d'implementation - 3 taches

## 1. Retirer la fonctionnalite d'achat de tokens vendeur

Le systeme de tokens a deja ete retire de la navigation (selon la memoire du projet), mais les composants existent encore. On va nettoyer les fichiers restants.

**Fichiers a supprimer :**
- `src/components/tokens/BuyTokensDialog.tsx`
- `src/components/tokens/TokenBalanceCard.tsx`
- `src/components/tokens/TokenHistoryTable.tsx`
- `src/components/shops/VendorTokensSection.tsx`
- `src/components/driver/DriverTokensSection.tsx`
- `supabase/functions/purchase-tokens/index.ts`

**Fichiers a modifier :**
- `src/pages/Transactions.tsx` : Retirer le filtre "Tokens" et la stat card Tokens
- Verifier qu'aucun autre fichier n'importe ces composants (recherche deja faite : aucun import actif)

---

## 2. Remplacer la generation d'images Lovable AI par Pollinations.ai

**Pourquoi Pollinations.ai ?**
- 100% gratuit, sans cle API, sans inscription
- Simple URL : `https://image.pollinations.ai/prompt/{prompt}?width=1024&height=1024`
- Fonctionne directement depuis le frontend (pas besoin d'edge function)
- Modeles open-source (Flux)

**Changements :**
- **`supabase/functions/generate-marketing-image/index.ts`** : Remplacer l'appel Lovable AI Gateway par un appel a `https://image.pollinations.ai/prompt/...`. L'image retournee est directement un binaire PNG qu'on uploade dans le bucket Storage `generated-images`.
- **`src/components/shops/tabs/MarketingTab.tsx`** : Aucun changement d'interface necessaire, le flux reste identique (prompt -> edge function -> image sauvegardee).
- La dependance a `LOVABLE_API_KEY` est supprimee pour cette fonction.

**Flux technique :**
1. Le vendeur entre son prompt
2. L'edge function appelle `https://image.pollinations.ai/prompt/{encodedPrompt}?width=1024&height=1024&nologo=true`
3. L'API retourne directement l'image en binaire
4. L'edge function uploade dans Supabase Storage
5. L'URL publique est sauvegardee en base

**Limitation :** Pollinations.ai ne supporte pas l'edition d'image par reference. La fonctionnalite "modifier une image" sera retiree (upload d'image de reference). Seule la generation a partir de texte sera disponible.

---

## 3. Integrer les statistiques de boutique dans l'onglet Stats

L'onglet Stats (actuellement "En construction") sera remplace par un dashboard avec des donnees reelles tirees des tables existantes.

**Statistiques affichees :**

### Cartes de synthese (4 cartes en grille)
- **Chiffre d'affaires** : Somme des `order_items.total_price` pour le `shop_id` (commandes livrees/payees) + somme des `service_bookings` completees
- **Commandes produits** : Nombre total d'`orders` pour ce `shop_id`
- **Reservations services** : Nombre total de `service_bookings` pour les services du shop
- **Note moyenne** : Moyenne des avis (`shop_reviews`, `product_reviews`, `service_reviews`)

### Graphique des revenus (recharts - deja installe)
- Graphique en barres des revenus par mois (6 derniers mois)
- Donnees tirees de `order_items` et `service_bookings` regroupees par mois

### Tableau des produits les plus vendus
- Top 5 produits par quantite vendue (agrege depuis `order_items`)

### Tableau des recettes en attente
- Payouts en attente depuis `pending_payouts` ou `recipient_id = shop.owner_id`

**Composant :** `src/components/shops/tabs/StatsTab.tsx` sera reecrit pour accepter `shopId` en prop et afficher les donnees reelles.

**Fichiers a modifier :**
- `src/components/shops/tabs/StatsTab.tsx` : Reecriture complete
- `src/pages/ShopDetail.tsx` : Passer `shopId` au composant `StatsTab`
- `src/pages/MyShop.tsx` : Passer `shop.id` au composant `StatsTab`

