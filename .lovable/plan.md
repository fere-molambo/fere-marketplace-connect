

# Plan : Demandes de suppression de compte + Bouton activation boutique admin

## Partie 1 : Systeme de demande de suppression de compte

### Contexte
Google Play Store exige un lien permettant aux utilisateurs de demander la suppression de leur compte. La fonction `delete-user` existe deja mais est reservee aux admins. Il faut un systeme de **demandes** que les utilisateurs soumettent et que les admins traitent.

### 1.1 Migration DB : table `account_deletion_requests`

```sql
CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_note text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own requests
CREATE POLICY "Users can create own deletion request"
  ON public.account_deletion_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON public.account_deletion_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Admins can view and manage all requests
CREATE POLICY "Admins can manage all requests"
  ON public.account_deletion_requests FOR ALL
  TO authenticated USING (
    has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin')
  );

-- Allow anonymous inserts for public page
CREATE POLICY "Public can create deletion request"
  ON public.account_deletion_requests FOR INSERT
  TO anon WITH CHECK (true);
```

### 1.2 Page publique `/delete-account`

Creer `src/pages/DeleteAccount.tsx` :
- Formulaire simple : numero de telephone ou email, raison (optionnel)
- Si l'utilisateur est connecte, pre-remplir et lier a son `user_id`
- Si non connecte, enregistrer la demande avec le contact fourni (ajouter un champ `contact_info` a la table)
- Message de confirmation : "Votre demande a ete enregistree. L'equipe Fere vous contactera dans un delai de 30 jours."
- Ajouter la route dans `App.tsx`

### 1.3 Onglet admin dans la page Utilisateurs

Ajouter un onglet "Demandes de suppression" dans `src/pages/Users.tsx` :
- Liste des demandes avec statut (En attente, Approuvee, Rejetee, Terminee)
- Pour chaque demande : nom de l'utilisateur, date, raison, actions
- Bouton "Approuver et supprimer" : appelle `delete-user` puis met le statut a `completed`
- Bouton "Rejeter" avec note admin
- Compteur badge sur l'onglet pour les demandes en attente

### Fichiers modifies/crees

| Fichier | Action |
|---|---|
| `supabase/migrations/[new].sql` | Table `account_deletion_requests` + RLS |
| `src/pages/DeleteAccount.tsx` | Nouvelle page publique |
| `src/App.tsx` | Ajouter route `/delete-account` |
| `src/pages/Users.tsx` | Ajouter onglet "Demandes de suppression" |
| `src/integrations/supabase/types.ts` | Auto-mis a jour |

---

## Partie 2 : Bouton activation/desactivation boutique par admin

### Probleme
Le statut `verification_status` existe sur les boutiques mais il n'y a aucun bouton dans la page de detail pour le changer. Les admins voient "En attente" mais ne peuvent pas activer.

### Solution
Ajouter dans `ShopDetail.tsx`, juste sous le nom de la boutique, un bandeau d'action admin visible uniquement pour les admins/super_admins :
- Badge du statut actuel (En attente / Verifiee / Rejetee)
- Bouton "Activer" (passe a `verified`) ou "Desactiver" (passe a `pending`) ou "Rejeter" (passe a `rejected`)
- Confirmation avant changement

### Fichiers modifies

| Fichier | Action |
|---|---|
| `src/pages/ShopDetail.tsx` | Ajouter bandeau admin avec boutons activer/desactiver/rejeter |

---

## Partie 3 : Prompt Bolt.new pour suppression de compte mobile

Le prompt sera fourni dans le message d'implementation, indiquant a Bolt.new :
- Ajouter un bouton "Supprimer mon compte" dans les parametres du profil
- INSERT dans `account_deletion_requests` avec `user_id` et `reason`
- Afficher confirmation
- Lien vers `https://fere.app/delete-account` en alternative

