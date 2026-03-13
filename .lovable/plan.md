

# Fix : URLs sandbox Orange Money

## Problème

L'Edge Function web utilise `/v1/` (production) alors que votre app Orange Developer est abonnée à **"Orange Money WebPay Dev"** (sandbox) qui utilise `/dev/v1/`. C'est pour cela que ça marche sur mobile (Bolt utilise probablement `/dev/v1/`) mais pas ici.

## Modification

Fichier : `supabase/functions/orange-money-payment/index.ts`

1. **Ligne 174** : `/orange-money-webpay/v1/webpayment` → `/orange-money-webpay/dev/v1/webpayment`
2. **Ligne 271** : `/orange-money-webpay/v1/transactionstatus` → `/orange-money-webpay/dev/v1/transactionstatus`

Puis redéployer la fonction.

> Quand vous passerez en production sur Orange Developer, il faudra revenir à `/v1/`.

