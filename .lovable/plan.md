
Objectif immédiat: corriger le flux de réservation de service avec acompte Paystack pour empêcher toute réservation non payée de bloquer l’utilisateur, restaurer un retour de succès clair après paiement, puis valider en test bout-en-bout.

Constats confirmés (diagnostic)
1) Réservation créée avant confirmation du paiement
- Dans `src/pages/ServiceBooking.tsx`, la réservation est insérée d’abord (`service_bookings.insert(...)`), puis seulement après on tente `supabase.functions.invoke("paystack-payment", action:"initialize")`.
- Si l’initialisation Paystack échoue, la réservation reste en `status="pending"` avec `payment_status="pending"` et `travel_fee_paid=false`.
- C’est exactement ce qui provoque ensuite le blocage “Vous avez déjà une réservation en cours...”.

2) Incohérence/erreur probable sur l’Edge Function Paystack déployée
- L’appel de test à `/paystack-payment` ne répond pas comme le code attendu: message `email, amount, and reference are required` sur initialize (comportement incohérent avec le fichier local).
- Le verify renvoie `status: "unknown"` au lieu du format attendu par `PaymentCallback` (success/failed/abandoned).
- Cela explique l’absence de feedback de succès fiable sur la page callback.

3) Données réelles incohérentes observées en base
- Présence de bookings `pending` sans `payment_reference` et sans transaction Paystack liée, donc créés mais non payés.
- C’est un défaut métier critique: réservation active sans acompte effectif.

4) Test E2E impossible à finaliser côté agent tant que la session preview n’est pas authentifiée
- La page s’ouvre sur `/auth` dans la session de test automatisé actuelle; pour valider le flux complet il faut une session connectée.

Plan de correction (implémentation)
Étape 1 — Correctif d’urgence backend Paystack (priorité absolue)
- Aligner et redéployer `supabase/functions/paystack-payment/index.ts` pour garantir ce contrat:
  - `initialize` accepte `amount,email,payment_type,related_id,metadata,callback_url` et retourne `authorization_url + reference`.
  - `verify` retourne un `status` normalisé (`success|failed|abandoned`) + metadata.
- Vérifier que la fonction actuellement déployée correspond bien au code repo (problème de drift de déploiement à corriger).
- Contrôler les secrets Paystack (déjà présents) et logs function après test.
Résultat attendu: plus d’erreur de contrat API côté frontend.

Étape 2 — Empêcher la création “bloquante” sans paiement (ServiceBooking)
- Modifier `src/pages/ServiceBooking.tsx` pour supprimer le scénario “booking pending orpheline”:
  Option robuste immédiate:
  - Garder création booking puis init paiement, MAIS en cas d’échec initialize:
    - rollback immédiat: supprimer la réservation créée (ou la marquer `cancelled/expired` automatiquement si suppression impossible).
    - toast explicite “Paiement non initialisé, aucune réservation active n’a été conservée.”
  Amélioration UX incluse:
  - si booking actif trouvé avec `payment_status='pending'` + `travel_fee_paid=false` + `payment_reference null`, afficher bouton “Reprendre le paiement” au lieu de bloquer sec.
- Corriger le texte trompeur “Orange Money” dans ce flow Paystack (cohérence produit actuelle).

Étape 3 — Réparer l’expérience callback succès
- Ajuster `src/pages/PaymentCallback.tsx` pour gérer les statuts inattendus (`unknown`, null) proprement:
  - message d’état explicite + action de secours (“Vérifier dans mes réservations”).
- Pour `payment_type='service_booking'` acompte, afficher succès clair + bouton “Voir mes réservations”.
- Sécuriser la récupération du type de paiement:
  - priorité metadata backend, fallback sessionStorage.
- Ne pas laisser l’UI sans titre/message en cas de statut non mappé.

Étape 4 — Nettoyage de données incohérentes existantes
- Purger/annuler les `service_bookings` bloquées non payées (pending + travel_fee>0 + travel_fee_paid=false + pas de transaction succès liée) afin d’éviter de continuer à bloquer les clients.
- Vérifier qu’aucun `pending_payout` ou `refund` parasite n’est généré pour ces enregistrements.

Étape 5 — Validation technique et tests
A. Tests backend
- Appeler `paystack-payment` initialize/verify via outil edge function pour vérifier le contrat réel.
- Vérifier logs edge function après appels.

B. Tests applicatifs E2E (web)
- Précondition: session connectée en preview.
- Cas 1: réservation avec frais déplacement > 0
  - clic réserver -> redirection Paystack -> paiement succès -> retour callback avec message succès + bouton “Voir mes réservations”.
  - vérifier en base: booking créé, `travel_fee_paid=true`, `payment_status='partial'`, `payment_reference` renseignée.
- Cas 2: échec/annulation initialize
  - s’assurer qu’aucune réservation bloquante n’est conservée.
- Cas 3: tentative répétée après échec
  - l’utilisateur doit pouvoir réessayer sans message de blocage abusif.

C. Non-régression
- Vérifier que paiement du solde prestation (arrived -> pay completion) fonctionne toujours.
- Vérifier que le flux commande produit (`Checkout` / `order_balance`) n’est pas cassé.

Risques et mitigation
- Risque: divergence entre code local et fonction déployée.
  - Mitigation: validation systématique du contrat via appel direct à l’edge function + logs après déploiement.
- Risque: suppression de réservation trop agressive.
  - Mitigation: rollback conditionnel uniquement sur échec d’initialize avant redirection; journaliser l’échec.

Ordre d’exécution recommandé (rapide)
1) Corriger/déployer `paystack-payment` (cause racine probable).
2) Corriger `ServiceBooking.tsx` (rollback + reprise paiement + textes).
3) Corriger `PaymentCallback.tsx` (feedback succès/fallback robuste).
4) Nettoyer données orphelines existantes.
5) Exécuter tests E2E avec session utilisateur connectée.

Livrable attendu après implémentation
- Plus aucune réservation active créée sans acompte validé.
- Message de succès callback visible et actionnable après paiement.
- Plus de blocage “réservation en cours” à tort.
- Preuve de test bout-en-bout sur le flow complet.
