

# Dashboard enrichi avec statistiques, graphes et responsive mobile/tablette

## Fichiers a creer

### 1. `src/components/dashboard/PeriodSelector.tsx`
Composant Select shadcn avec options : 7j, 30j, 90j, 12 mois. Retourne `{ startDate, endDate }`. Layout compact pour mobile (full-width sur `sm:`).

### 2. `src/components/dashboard/AdminDashboard.tsx`
Vue admin complete avec :
- **KPI Cards** (grille `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`) : CA total, commandes, reservations, commissions plateforme, livraisons, nouveaux utilisateurs — toutes filtrees par periode
- **Graphe revenus** : BarChart Recharts empile (produits, services, livraisons) — `ResponsiveContainer` pleine largeur, hauteur reduite sur mobile (200px vs 300px)
- **Graphe volume commandes** : LineChart commandes + reservations par semaine/mois
- **Top 10 produits** : Table avec scroll horizontal sur mobile (`overflow-x-auto`)
- **Top boutiques par CA** : idem
- **Stats par zone de livraison** : grille cards `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

Queries : `orders`, `order_items`, `service_bookings`, `delivery_requests`, `profiles`, `payment_transactions` filtrees par `created_at >= startDate`.

### 3. `src/components/dashboard/VendorDashboard.tsx`
Reprend la logique de `StatsTab` existante mais avec :
- PeriodSelector integre
- KPI Cards en grille responsive `grid-cols-2 lg:grid-cols-4`
- Ajout d'une carte "Recettes en attente" (depuis `pending_payouts`)
- Graphe revenus et top produits deja presents dans StatsTab

### 4. `src/components/dashboard/RevenueChart.tsx`
Composant reutilisable BarChart empile. Props : `data`, `height` (defaut 280, reduit a 200 sur mobile via `useIsMobile`).

### 5. `src/components/dashboard/OrdersChart.tsx`
LineChart volume commandes/reservations. Meme pattern responsive.

### 6. `src/components/dashboard/TopProductsTable.tsx`
Table responsive avec `overflow-x-auto` et `min-w-[400px]` sur le tableau interne.

### 7. `src/components/dashboard/ZoneStatsCard.tsx`
Cards zones de livraison avec nb commandes et CA par zone.

## Fichier modifie

### `src/pages/Dashboard.tsx`
- Importer `useUserRoles`
- Si `isSuperAdmin || isAdmin` → render `<AdminDashboard />`
- Si `isVendeur` → render `<VendorDashboard />`
- Sinon → affichage basique actuel

## Strategie responsive

Toutes les grilles utilisent le pattern mobile-first :
- Cards KPI : `grid-cols-2` mobile, `lg:grid-cols-4` ou `xl:grid-cols-6` desktop
- Graphes : `ResponsiveContainer width="100%" height={isMobile ? 200 : 300}`
- Tableaux : wrapper `div` avec `overflow-x-auto` pour scroll horizontal mobile
- PeriodSelector : `w-full sm:w-auto` pour prendre toute la largeur mobile
- Titres : `text-xl sm:text-2xl lg:text-3xl`
- Espacement : `space-y-4 lg:space-y-6`, padding `p-0` (gere par DashboardLayout)
- Sidebar : deja collapsible via `SidebarProvider` — fonctionne nativement en mobile

