

# Plan : Page Contact publique + Gestion des demandes admin

## Ce qui sera fait

### 1. Migration DB : table `contact_requests`

Nouvelle table pour stocker les demandes de contact :
```sql
CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new', -- new, read, replied, archived
  replied_by uuid REFERENCES auth.users(id),
  replied_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut soumettre une demande
CREATE POLICY "Anyone can submit contact" ON public.contact_requests
  FOR INSERT TO public WITH CHECK (true);

-- Admins voient et gèrent tout
CREATE POLICY "Admins can manage contacts" ON public.contact_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));
```

### 2. Page publique `/contact`

Formulaire avec :
- Nom complet (requis)
- Téléphone (requis)
- Email (optionnel)
- Sujet (select : Question générale, Partenariat, Problème technique, Réclamation, Autre)
- Message (requis, textarea)
- Bouton envoyer → insert dans `contact_requests`
- Design cohérent avec le reste du site (Navbar + Footer)

### 3. Navbar : changer le lien Contact

`/#contact` → `/contact`

### 4. Page dashboard `/dashboard/contact-requests`

Table listant les demandes avec :
- Date, Nom, Sujet, Statut (badge coloré)
- Filtres par statut
- Sheet de détail au clic avec possibilité de :
  - Changer le statut (new → read → replied → archived)
  - Ajouter des notes admin

### 5. Sidebar : menu "Demandes" pour admins

Ajouter une entrée "Demandes" (icône `Mail`) dans le sidebar, visible uniquement pour super_admin et admin, après "Zones de livraison".

### 6. Routes dans App.tsx

- `/contact` → nouvelle page publique Contact
- `/dashboard/contact-requests` → page admin (dans le layout dashboard)

### 7. Types Supabase

Ajouter le type `contact_requests` dans `types.ts`.

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/[new].sql` | Table `contact_requests` + RLS |
| `src/integrations/supabase/types.ts` | Type `contact_requests` |
| `src/pages/Contact.tsx` | **Nouveau** — page publique formulaire |
| `src/pages/ContactRequests.tsx` | **Nouveau** — page admin listing |
| `src/components/landing/Navbar.tsx` | Lien `/#contact` → `/contact` |
| `src/components/layout/AppSidebar.tsx` | Menu "Demandes" admins |
| `src/App.tsx` | 2 nouvelles routes |

