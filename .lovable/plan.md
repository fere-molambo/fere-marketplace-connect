

# 1. Correction vue vendeur pour commandes annulees + 2. Instructions mobile

## Partie 1 : Simplifier la vue vendeur pour les commandes annulees

### Probleme
Quand le vendeur ouvre le detail d'une commande annulee, il voit des badges de paiement ("Acompte paye") et des informations financieres qui ne le concernent pas. Le vendeur a seulement besoin de savoir :
- Que la commande a ete annulee
- Quand elle a ete annulee
- Le motif d'annulation
- Par qui elle a ete annulee
- L'etat du retour du produit

### Corrections dans `OrderDetailSheet.tsx`

1. **Masquer le badge `PaymentStatusBadge`** quand `isVendorView` est true et que la commande est annulee
2. **Masquer le bloc "Recapitulatif financier"** pour le vendeur sur les commandes annulees (pas d'acompte, pas de "reste a payer" - le vendeur n'a rien recu)
3. **Garder visible** : le `CancellationBanner` avec motif, date, annuleur, et le tracker de retour

### Corrections dans `CancellationBanner.tsx`

Ajouter un prop `isVendorView` pour masquer les consequences financieres (remboursement, penalite) qui ne concernent que l'admin/client.

---

## Partie 2 : Instructions Bolt.new pour les applications mobiles

Deux documents d'instructions seront crees dans le dossier `docs/` :

### `docs/BOLT_DRIVER_APP.md` - Application Livreur
Contenu detaille incluant :
- Connexion Supabase (URL + anon key)
- Authentification livreur (sign in, role `livreur`)
- Dashboard livreur : toggle disponibilite, mise a jour GPS en temps reel
- Livraisons en attente : liste filtree par zone, acceptation
- Livraison active : flux 7 etapes (pending -> assigned -> in_progress -> picked_up -> en_route_client -> arrived -> delivered)
- Flux retour : 3 etapes (en_route_vendor -> arrived_vendor -> returned) via `return_status`
- Annulation par le livreur (avec motif)
- Historique des livraisons avec gains
- Tokens : achat et suivi du solde
- Subscriptions realtime sur `delivery_requests`
- Toutes les requetes Supabase necessaires avec exemples de code

### `docs/BOLT_CLIENT_APP.md` - Application Client
Contenu detaille incluant :
- Connexion Supabase (URL + anon key)
- Authentification client (sign up/in, role `client`)
- Catalogue : produits et services avec filtres
- Panier persistant (localStorage)
- Systeme de prix : fixe, negoce (prix propose), en gros (intervalles)
- Checkout : selection adresse, calcul livraison, paiement acompte via Paystack
- Paiement en 2 etapes : acompte (frais livraison + commissions) puis solde a l'arrivee
- Suivi commande en temps reel (7 etapes livraison)
- Actions client a l'arrivee : payer le solde ou annuler
- Annulation : motif, piece jointe, remboursement selon le moment
- Reservation de services avec calendrier
- Profil, adresses de livraison, favoris
- Messagerie
- Subscriptions realtime sur `orders` et `delivery_requests`

### Details techniques dans les fichiers

Chaque fichier contiendra :
- Les schemas de tables exactes avec les colonnes pertinentes
- Les workflows d'etats (state machines) avec diagrammes ASCII
- Les exemples de code TypeScript/Supabase prets a copier
- Les regles metier critiques (ex: service = cash uniquement, acompte = en ligne)
- Les edge functions a appeler avec parametres exacts
- Les subscriptions realtime a configurer

---

## Resume des fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/components/orders/OrderDetailSheet.tsx` | Masquer badges paiement et recap financier pour le vendeur sur commandes annulees |
| `src/components/orders/CancellationBanner.tsx` | Ajouter prop `isVendorView` pour masquer les infos financieres |
| `docs/BOLT_DRIVER_APP.md` | Nouveau - Instructions completes app livreur |
| `docs/BOLT_CLIENT_APP.md` | Nouveau - Instructions completes app client |

