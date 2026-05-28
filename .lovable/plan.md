Le problème observé n’est plus le domaine noir Lovable : le retour arrive bien sur Fere, mais l’app mobile appelle ensuite l’edge function avec `action: "complete_payment"`, alors que `orange-money-payment` n’accepte actuellement que `verify`. Les logs montrent plusieurs erreurs `Invalid action` juste après le webhook réussi, donc l’app mobile n’arrive pas à finaliser et rouvre la page Orange Money.

Plan de correction :

1. Ajouter la compatibilité mobile dans `supabase/functions/orange-money-payment/index.ts`
   - Accepter `action: "complete_payment"` comme alias de vérification/finalisation.
   - Lire `reference` ou `order_id` indifféremment.
   - Lire `pay_token` depuis le body ou depuis `payment_transactions.metadata`.
   - Si la transaction est déjà `success` via webhook, répondre directement succès sans recontacter Orange inutilement.

2. Normaliser les statuts retournés à l’app mobile
   - Retourner `success` quand le paiement est confirmé.
   - Retourner `pending` si Orange/webhook n’a pas encore fini.
   - Retourner `failed` uniquement si Orange confirme l’échec.
   - Inclure `reference`, `amount`, `currency`, `payment_type`, `related_id`, `metadata` pour que l’app mobile puisse continuer son process.

3. Éviter la boucle Orange Money
   - Ne pas transformer un statut `pending` immédiat en erreur bloquante côté fonction.
   - Faire en sorte que les appels répétés `complete_payment` finissent par renvoyer succès dès que le webhook a mis `payment_transactions.status = success`.

4. Vérification après changement
   - Déployer l’edge function `orange-money-payment`.
   - Relire les logs sur un nouveau paiement : on doit voir `complete_payment` traité correctement, plus d’erreur `Invalid action`.
   - Confirmer que le webhook continue de mettre la transaction en `success` et que l’app peut finaliser la commande.