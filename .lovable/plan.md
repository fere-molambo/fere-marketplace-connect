
# Refonte du systeme de reservation de services

## Vue d'ensemble

Refonte complete du workflow de reservation avec statuts clairs, actions client/vendeur separees, paiements Orange Money, annulations/litiges, et auto-expiration 24h. Tous les composants seront responsive.

## 1. Migration base de donnees

### Nouveaux champs sur `service_bookings`

| Colonne | Type | Default | Description |
|---------|------|---------|-------------|
| `accepted_by` | uuid | null | Qui a accepte (vendeur/equipe) |
| `accepted_at` | timestamptz | null | Date acceptation |
| `started_at` | timestamptz | null | Prestataire demarre vers client |
| `arrived_at` | timestamptz | null | Prestataire arrive (remplace vendor_arrived_at pour coherence) |
| `completed_at` | timestamptz | null | Date completion |
| `completion_type` | text | null | 'full', 'partial', 'cancelled_at_arrival' |
| `partial_payment_amount` | numeric | null | Montant si 50% |
| `cancellation_reason_id` | uuid | null | FK cancellation_reasons |
| `cancellation_comment` | text | null | Commentaire client |
| `cancellation_proof_url` | text | null | Preuve upload |
| `vendor_dispute_comment` | text | null | Commentaire vendeur pour litiges |
| `balance_payment_reference` | text | null | Ref paiement solde |
| `balance_payment_status` | text | 'pending' | Statut paiement solde |
| `auto_cancel_at` | timestamptz | null | created_at + 24h |

### Statuts du workflow

```text
pending --> accepted --> on_the_way --> arrived --> completed (100%)
   |           |                                --> partial (50%)
   |           |                                --> cancelled (a l'arrivee)
   |           +--> cancelled (par client)
   +--> cancelled (par client)
   +--> expired (auto 24h)
```

### Politique RLS supplementaire
- UPDATE pour le client : `auth.uid() = customer_id` (pour marquer completion/annulation)

### Forcer `requires_booking = true`
- UPDATE tous les services existants pour mettre `requires_booking = true`
- ALTER TABLE services SET DEFAULT true pour `requires_booking`

## 2. Formulaires creation/modification de prestation

### Fichiers : `CreateServiceDialog.tsx`, `EditServiceDialog.tsx`

- **Supprimer** le toggle "Reservation requise" et forcer `requires_booking: true` dans l'insert/update
- **Afficher** toujours le bloc frais de deplacement (plus conditionnel a `requiresBooking`)
- **Nouvelles options de duree** :
  - "1h ou plus" (valeur: `60`)
  - "3h ou plus" (valeur: `180`)
  - "24h ou plus" (valeur: `1440`)
  - "2 jours ou plus" (valeur: `2880`)
  - "Autre" (valeur: `custom`) avec un champ libre + unite (min/h/j)

## 3. Page ServiceDetail.tsx

- Supprimer le bloc conditionnel `if (service.requires_booking)` (lignes 245-260)
- Toujours afficher les infos de frais de deplacement
- Le bouton "Reserver" est deja toujours visible (ligne 290) -- OK

## 4. Flux de reservation (ServiceBooking.tsx)

- Changer le statut initial de `reserved` a `pending`
- Calculer `auto_cancel_at = now() + 24h`
- Si frais de deplacement gratuits : reservation directe sans paiement
- Si frais payants : paiement Orange Money = acompte (frais de deplacement)
- Supprimer la mention "A payer en especes" car le solde se paiera via Orange Money
- Adapter le texte explicatif

## 5. Nouveau composant : `ClientBookingDetailSheet.tsx`

Sheet responsive pour le client avec :

**Affichage du statut en temps reel** avec tracker visuel (etapes)

**Actions selon le statut :**
- `pending` : "En attente d'acceptation" + bouton Annuler (remboursement acompte si paye)
- `accepted` : "Acceptee" + bouton Annuler (remboursement acompte si paye)
- `on_the_way` : "Prestataire en route" -- pas d'annulation
- `arrived` : "Prestataire arrive" + 3 boutons :
  - "Payer 100%" : paiement Orange Money (prix service + commission)
  - "Payer 50%" : paiement OM 50% + commission, avec motif + commentaire + upload preuve
  - "Annuler" : motif + preuve, pas de remboursement acompte
- `completed` / `partial` / `cancelled` / `expired` : lecture seule

**Logique d'annulation :**
- Avant `on_the_way` : annulation libre, remboursement acompte cree dans table `refunds` si applicable
- Pendant `on_the_way` : annulation impossible
- A `arrived` + annulation : pas de remboursement acompte, admin reverse au vendeur plus tard

## 6. Refonte BookingDetailSheet.tsx (vue vendeur/equipe)

**Boutons d'action :**
- `pending` : "Accepter la prestation" (enregistre `accepted_by`, `accepted_at`)
- `accepted` : "Demarrer vers client" (-> `on_the_way`, `started_at`)
- `on_the_way` : "Je suis arrive" (-> `arrived`, `arrived_at`)
- `arrived` : Message "En attente de l'action du client"
- `completed`/`partial` : Lecture seule + champ commentaire vendeur pour litiges
- `cancelled` : Lecture seule + champ commentaire vendeur

Le vendeur ne peut plus marquer "Service termine" -- c'est le client qui decide.

## 7. Integration dans ClientProfile.tsx

- Ajouter un bouton "Details" sur chaque reservation (comme pour les commandes produits)
- Ouvrir `ClientBookingDetailSheet` au clic
- Abonnement Realtime sur `service_bookings` pour MAJ instantanees

## 8. OrderStatusBadge.tsx

Ajouter les nouveaux statuts :
- `accepted` : "Acceptee" (cyan)
- `partial` : "Partielle (50%)" (amber)
- `expired` : "Expiree" (gray)
- `pending_refund` : "Remboursement en attente" (orange)

## 9. Paiement du solde (Orange Money)

Quand le client choisit "Payer 100%" ou "Payer 50%" :
- Appeler `orange-money-payment` avec `payment_type: 'service_booking'`
- Montant : prix service + commission (ou 50% + commission)
- Au retour, verifier et mettre a jour `completion_type`, `balance_payment_status`, `completed_at`
- Creer `pending_payouts` pour le vendeur

## 10. Auto-expiration 24h

- Utiliser `pg_cron` + `pg_net` pour appeler une edge function toutes les heures
- La fonction verifie les bookings `pending` ou `auto_cancel_at < now()`
- Passe a `expired`, cree un `refund` si acompte paye

## Sequence d'implementation

1. Migration DB (champs + RLS + defaults)
2. Formulaires creation/modification service (toggle + durees)
3. ServiceDetail (supprimer conditionnel requires_booking)
4. ServiceBooking (statut initial pending, auto_cancel_at)
5. OrderStatusBadge (nouveaux statuts)
6. BookingDetailSheet refonte (vue vendeur)
7. ClientBookingDetailSheet (nouveau composant client)
8. ClientProfile integration (bouton details + realtime)
9. Edge function auto-expiration + cron
10. Tests

## Fichiers modifies/crees

- **Migration SQL** : ~1 fichier
- `src/components/shops/CreateServiceDialog.tsx` : toggle + durees
- `src/components/shops/EditServiceDialog.tsx` : idem
- `src/pages/ServiceDetail.tsx` : conditionnel requires_booking
- `src/pages/ServiceBooking.tsx` : statut pending, auto_cancel_at
- `src/components/orders/OrderStatusBadge.tsx` : nouveaux statuts
- `src/components/orders/BookingDetailSheet.tsx` : refonte vendeur
- **NOUVEAU** `src/components/orders/ClientBookingDetailSheet.tsx` : vue client
- `src/pages/ClientProfile.tsx` : integration details + realtime bookings
- **NOUVEAU** `supabase/functions/expire-bookings/index.ts` : auto-expiration
- `supabase/config.toml` : config expire-bookings
