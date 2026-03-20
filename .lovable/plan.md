

# Plan : Rédiger et intégrer CGU, Privacy Policy et Cookies

## Contexte

L'application Fere (Fere SARL) est une marketplace Mali/Côte d'Ivoire avec :
- **Rôles** : membres (clients), vendeurs, livreurs, équipe, admins
- **Données collectées** : téléphone, nom, GPS temps réel (livreurs), photos, messages, historique commandes, favoris, avis
- **Paiement** : exclusivement Orange Money (FCFA)
- **Auth** : OTP via Ikoddi + PIN local
- **Infrastructure** : Supabase (hébergement cloud)

La table `platform_settings` a déjà `cgu` et `cookies` mais pas `privacy_policy`. Le footer a déjà les liens `/cgu`, `/privacy`, `/cookies` mais ces routes n'existent pas.

## Ce qui sera fait

### 1. Générer les 3 documents juridiques

Fichier `/mnt/documents/fere_legal_documents.md` contenant :

**CGU (~2500 mots)** :
- Objet et définitions (Fere, Utilisateur, Vendeur, Livreur, Tokens)
- Inscription et authentification (téléphone + OTP + PIN)
- Rôles et obligations de chaque partie
- Commandes, livraisons et flux de paiement (acompte + solde Orange Money)
- Système de tokens (monnaie interne)
- Annulations et remboursements (manuels, pas d'API refund automatique)
- Réservations de services et frais de déplacement
- Messagerie et avis
- Propriété intellectuelle
- Responsabilité et limitation
- Résiliation et suspension
- Droit applicable (Mali) et juridiction

**Politique de confidentialité (~2000 mots)** — conforme RGPD + exigences Apple/Google :
- Responsable du traitement : Fere SARL
- Données collectées par catégorie (identité, localisation, transactions, contenus, technique)
- Finalités et bases légales
- Partage avec tiers : Ikoddi (SMS/OTP), Orange Money (paiements), Supabase (hébergement)
- Durée de conservation
- Droits des utilisateurs (accès, rectification, suppression, portabilité)
- Sécurité (chiffrement PIN PBKDF2, HTTPS, RLS)
- Transferts internationaux
- Mineurs (interdit -18 ans)
- Modifications et contact

**Politique de cookies (~500 mots)** :
- Pas de cookies publicitaires
- Stockage local uniquement (localStorage/sessionStorage pour auth et panier)
- Pas de tracking tiers
- Gestion par l'utilisateur

### 2. Migration DB : ajouter `privacy_policy`

Nouvelle migration SQL :
```sql
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS privacy_policy text;
```

### 3. Créer la page publique `LegalPage.tsx`

Page générique qui :
- Accepte un paramètre de route (`/cgu`, `/privacy`, `/cookies`)
- Charge le contenu correspondant depuis `platform_settings` (`cgu`, `privacy_policy`, `cookies`)
- Affiche en Markdown rendu ou texte simple avec mise en forme
- Inclut le header/footer du site

### 4. Ajouter les 3 routes dans `App.tsx`

```
/cgu → LegalPage (champ: cgu)
/privacy → LegalPage (champ: privacy_policy)
/cookies → LegalPage (champ: cookies)
```

### 5. Ajouter textarea Privacy Policy dans PlatformSettings

Section "Documents légaux" : ajouter un 3e textarea "Politique de confidentialité" pour `privacy_policy`, à côté des existants `cgu` et `cookies`.

### 6. Mettre à jour types.ts

Ajouter `privacy_policy` au type `platform_settings`.

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `/mnt/documents/fere_legal_documents.md` | **Nouveau** — 3 documents juridiques complets |
| `supabase/migrations/[new].sql` | Migration ajout colonne `privacy_policy` |
| `src/integrations/supabase/types.ts` | Ajouter `privacy_policy` |
| `src/pages/LegalPage.tsx` | **Nouveau** — page publique légale |
| `src/App.tsx` | 3 nouvelles routes |
| `src/components/settings/PlatformSettings.tsx` | Textarea privacy policy |

## Résultat

- 3 documents juridiques professionnels prêts pour Apple/Google
- URLs publiques fonctionnelles pour les stores
- Contenu éditable par l'admin depuis le dashboard
- L'app mobile peut ouvrir ces URLs en WebView

