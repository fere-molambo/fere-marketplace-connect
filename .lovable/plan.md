
# Plan : Nettoyage des tokens + verification de bout en bout

## Ce qui reste a nettoyer

Les references aux tokens sont encore presentes dans 3 endroits :

### 1. `src/pages/ClientProfile.tsx` - Onglet "Tokens" du livreur
- Ligne 26 : import de `DriverTokensSection`
- Ligne 17 : import de `Coins` icon
- Lignes 393-396 : TabsTrigger "Tokens"
- Lignes 772-777 : TabsContent avec `<DriverTokensSection />`
- **Action** : Supprimer l'import, le TabsTrigger et le TabsContent

### 2. `src/pages/MyShop.tsx` - Onglet "Tokens" du vendeur
- Ligne 6 : import de `Coins` icon
- Ligne 17 : import de `VendorTokensSection`
- Lignes 113-116 : TabsTrigger "Tokens"
- Lignes 137-139 : TabsContent avec `<VendorTokensSection />`
- **Action** : Supprimer l'import, le TabsTrigger et le TabsContent

### 3. `src/components/orders/BookingDetailSheet.tsx` - Mention "tokens" dans le texte
- Ligne 414 : texte "deduite de vos tokens"
- **Action** : Remplacer par "Commission plateforme (...%) appliquee"

## Tests a effectuer apres nettoyage

### Navigation et affichage
1. Verifier que la page profil livreur n'affiche plus l'onglet "Tokens"
2. Verifier que la page "Ma Boutique" vendeur n'affiche plus l'onglet "Tokens"
3. Verifier que le BookingDetailSheet ne mentionne plus les tokens

### Verification des vues par role
4. **Client** : Profil > Commandes montre les commandes avec statut et paiement corrects
5. **Livreur** : Profil > Livraisons montre les livraisons avec gains et message d'attente au statut "arrived"
6. **Vendeur** : Ma Boutique > Commandes montre les commandes recues
7. **Admin** : Dashboard Paiements montre les versements en attente et les remboursements

## Fichiers modifies

1. `src/pages/ClientProfile.tsx` - Suppression onglet tokens livreur
2. `src/pages/MyShop.tsx` - Suppression onglet tokens vendeur
3. `src/components/orders/BookingDetailSheet.tsx` - Correction texte "tokens"
