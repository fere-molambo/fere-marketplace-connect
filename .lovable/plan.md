

# Plan : Corriger les CGU, Privacy Policy et Cookies

## Problèmes identifiés dans le contenu actuel en base

### CGU — Erreurs à corriger

1. **Article 2 — Définitions** : contient encore la définition des "Tokens" → supprimer
2. **Article 3.1** : "PIN à 4 chiffres" → corriger en **6 chiffres**
3. **Article 4.2** : "Disposer d'un solde de Tokens suffisant..." → supprimer cette obligation
4. **Article 4.3** : "Confirmer la livraison uniquement après remise effective au destinataire" → c'est le **client** qui confirme réception, pas le livreur. Remplacer par : "Remettre la commande au destinataire ou à la personne présente à l'adresse de livraison."
5. **Article 5.3 — Retrait en boutique** : supprimer entièrement (pas de retrait en boutique)
6. **Article 7 — Système de Tokens** : supprimer entièrement
7. **Article 9 — Annulations** : réécrire selon les règles réelles :
   - Avant expédition → remboursement de l'acompte
   - À l'arrivée du livreur/vendeur → pas de remboursement de l'acompte
   - Remboursements et versements traités manuellement par Fere
8. **Article 14.1** : "perte des Tokens" → supprimer la mention des Tokens
9. Renuméroter les articles après suppression de l'Article 7

### Privacy Policy — Erreurs à corriger

1. **Section 3.4** : "Solde et historique des Tokens" → supprimer cette ligne
2. **Section 5 — tableau** : "Google Maps" → remplacer par **OpenStreetMap** (l'app utilise OSM, pas Google Maps)

### Cookies — OK

Pas d'erreur identifiée.

### Couverture web + mobile

Les 3 documents mentionnent déjà "site web et applications mobiles (iOS et Android)" → OK pour les stores.

### Conformité Apple/Google

Les documents couvrent les exigences obligatoires :
- ✅ Données collectées par catégorie
- ✅ Finalités et bases légales
- ✅ Partage avec tiers nommés
- ✅ Droits des utilisateurs (accès, suppression, portabilité)
- ✅ Sécurité et chiffrement
- ✅ Mineurs (-18 ans)
- ✅ Notifications push avec consentement
- ✅ Contact du responsable

## Ce qui sera fait

1. Réécrire le CGU corrigé complet (sans tokens, sans retrait boutique, PIN 6 chiffres, Article 9 corrigé, confirmation réception par le client, articles renumérotés)
2. Corriger la Privacy Policy (supprimer tokens, remplacer Google Maps par OpenStreetMap)
3. Injecter les 2 documents corrigés en base via l'API Supabase

Aucun fichier de code à modifier — uniquement du contenu en base de données.

