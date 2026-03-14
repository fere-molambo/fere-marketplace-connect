

# Séparer indicatif pays et numéro de téléphone

## Contexte
Le bundle SMS de 100 unités est maintenant actif. Le formulaire actuel demande le numéro complet avec indicatif (ex: `+22370123456`), ce qui est source d'erreurs de saisie. On va séparer en deux champs : un sélecteur d'indicatif pays et un champ numéro local.

## Changements

### 1. Nouveau composant `PhoneInputWithCountry`
Créer `src/components/ui/PhoneInputWithCountry.tsx` :
- Un `<Select>` avec les indicatifs pays ciblés : `+225` (Côte d'Ivoire), `+223` (Mali), `+221` (Sénégal), `+220` (Gambie), etc.
- Afficher le drapeau emoji + code pays + indicatif dans chaque option
- Un `<Input>` pour le numéro local (sans indicatif)
- Le composant expose une valeur combinée `onChange(fullPhone)` = indicatif + numéro local
- Indicatif par défaut : `+225` (Côte d'Ivoire, puisque le bundle SMS est ivoirien)

### 2. Mettre à jour `PhoneSignupForm.tsx`
- Remplacer le champ `phone` unique par `<PhoneInputWithCountry>`
- Valeur par défaut de l'indicatif : `+225`

### 3. Mettre à jour `PhoneLoginForm.tsx`
- Même remplacement du champ phone par `<PhoneInputWithCountry>`

### 4. Validators (`src/lib/validators.ts`)
- Pas de changement nécessaire — la validation existante `^\+\d{10,15}$` fonctionne sur le numéro combiné

### 5. Edge Function — mode dev fallback
- Ajouter la vérification de solde SMS (`checkSmsBalance`)
- Retourner `sms_sent: boolean` et `dev_otp` quand l'envoi échoue
- Afficher l'OTP dans un bandeau "Mode Test" côté frontend si `sms_sent === false`

