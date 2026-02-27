
# Configuration du cron job pour expire-bookings

## Etape 1 : Activer les extensions pg_cron et pg_net

Migration SQL pour activer les deux extensions necessaires :

```text
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

## Etape 2 : Creer le cron job

Execution SQL directe (hors migration car contient l'anon key du projet) :

```text
SELECT cron.schedule(
  'expire-pending-bookings',
  '0 * * * *',   -- toutes les heures, a la minute 0
  $$
  SELECT net.http_post(
    url := 'https://jajfuajmkjulujnwfqen.supabase.co/functions/v1/expire-bookings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphamZ1YWpta2p1bHVqbndmcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjY3MzUsImV4cCI6MjA3OTA0MjczNX0.ME5XNJsLbB0InLeKexBcIGe5sxZZsd6Jg2W9oB0IBEQ"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
```

Cela appellera la edge function `expire-bookings` toutes les heures. Elle verifiera les reservations `pending` dont `auto_cancel_at` est depasse et les passera a `expired`, avec creation automatique de remboursement si l'acompte etait paye.

## Resume du workflow verifie

Le workflow complet est fonctionnel :

1. **Creation** : Client reserve, statut `pending`, `auto_cancel_at` = +24h
2. **Blocage multi-service** : Un client ne peut avoir qu'une seule reservation active
3. **Vendeur accepte** : `pending` -> `accepted` (avec `accepted_by`, `accepted_at`)
4. **Vendeur demarre** : `accepted` -> `on_the_way` (avec `started_at`)
5. **Vendeur arrive** : `on_the_way` -> `arrived` (avec `arrived_at`)
6. **Client decide** :
   - Payer 100% -> Orange Money -> `completed`
   - Payer 50% + motif/preuve -> Orange Money -> `partial` (litige)
   - Annuler -> `cancelled` (pas de remboursement acompte)
7. **Annulation anticipee** : Avant `on_the_way`, annulation libre avec remboursement acompte
8. **Expiration auto** : 24h sans acceptation -> `expired` + remboursement acompte
9. **PaymentCallback** : Met a jour le statut de la reservation et cree les payouts vendeur
