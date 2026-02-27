

# Plan : Corrections du workflow de reservation de services

## Problemes identifies

### 1. PaymentCallback ne gere pas la completion de service (CRITIQUE)

Quand le client paye 100% ou 50% via Orange Money et revient sur `/payment/callback`, la page verifie le paiement mais **ne met pas a jour** le statut de la reservation (`completed` ou `partial`). Les valeurs `om_booking_id` et `om_completion_type` sont stockees en sessionStorage mais jamais lues dans `PaymentCallback.tsx`.

**Correction :** Apres verification reussie du paiement, si `om_payment_type === 'service_booking'`, lire `om_booking_id` et `om_completion_type` depuis sessionStorage et mettre a jour `service_bookings` avec le statut appropriate (`completed` ou `partial`), `completion_type`, `balance_payment_status: 'paid'`, `completed_at`.

### 2. Un client peut commander plusieurs services a la fois (CORRECTION DEMANDEE)

Actuellement rien n'empeche un client de reserver plusieurs services simultanement. Le client devrait ne pouvoir commander qu'un service a la fois (pas dans un panier commun).

**Correction :** Dans `ServiceBooking.tsx`, avant de creer la reservation, verifier si le client a deja une reservation active (statut `pending`, `accepted`, `on_the_way`, ou `arrived`). Si oui, afficher un message d'erreur et bloquer la reservation.

### 3. Bucket de stockage `cancellation-attachments` potentiellement manquant

`ClientBookingDetailSheet.tsx` utilise le bucket `cancellation-attachments` pour l'upload de preuves. Ce bucket n'est pas liste dans les buckets existants documentes.

**Correction :** Verifier si le bucket existe, sinon le creer via migration SQL ou le remplacer par un bucket existant (ex: `chat-media` ou creer `cancellation-attachments`).

### 4. Messages du PaymentCallback non adaptes pour les services

Les titres et descriptions dans `PaymentCallback` sont centres sur les commandes produits ("Acompte paye", "solde a la livraison"). Pour un paiement de service, les messages devraient etre adaptes.

**Correction :** Ajouter des conditions pour `service_booking` dans `getStatusTitle()` et `getStatusDescription()` pour afficher des messages pertinents (ex: "Prestation payee avec succes", "Reservation confirmee").

### 5. Redirection apres reservation gratuite

Ligne 289 de `ServiceBooking.tsx` : quand les frais de deplacement sont gratuits, le client est redirige vers `/payment/callback?reference=BOOKING-...&status=success`, mais PaymentCallback essaie de verifier via Orange Money ce qui echouera.

**Correction :** Pour les reservations sans paiement, rediriger directement vers `/mon-profil?tab=orders` avec un toast de succes, au lieu de passer par PaymentCallback.

## Fichiers a modifier

1. **`src/pages/PaymentCallback.tsx`**
   - Apres verification reussie, si `om_payment_type === 'service_booking'`, mettre a jour la reservation
   - Adapter les messages pour les differents types de paiement
   - Nettoyer `om_booking_id` et `om_completion_type` du sessionStorage

2. **`src/pages/ServiceBooking.tsx`**
   - Ajouter une query pour verifier si le client a une reservation active
   - Bloquer la soumission si une reservation est deja en cours
   - Afficher un avertissement avec lien vers "Mes reservations"
   - Corriger la redirection pour les reservations gratuites (vers `/mon-profil` au lieu de `/payment/callback`)

3. **Migration SQL (si necessaire)**
   - Creer le bucket `cancellation-attachments` si inexistant

## Sequence

1. Corriger `PaymentCallback.tsx` (critique)
2. Corriger `ServiceBooking.tsx` (redirection gratuite + limite 1 reservation active)
3. Verifier/creer le bucket de stockage
