

# Diagnostic : Pourquoi l'OTP et le PIN ne fonctionnent pas

## Ce que les logs révèlent

```text
Chronologie :
14:55:56  →  Ikoddi envoie OTP, otpToken stocké ✅
14:56:34  →  Tentative verify → Ikoddi répond "OTP expired" ❌
14:57:41  →  2e tentative verify → Ikoddi répond "OTP expired" ❌

Temps écoulé : ~1min40 seulement
```

**Trois problèmes distincts :**

1. **Ikoddi dit "OTP expired" après seulement ~2 minutes** — L'expiration OTP est configurée dans l'app OTP sur le dashboard Ikoddi. Elle est probablement réglée à 60 secondes au lieu de 5 minutes.

2. **Le SMS n'arrive pas sur ton téléphone** — Ikoddi affiche "Succès" mais le SMS n'est pas délivré. C'est un problème opérateur/Ikoddi (route SMS, format du numéro, etc.).

3. **Le PIN ne fonctionne pas au login** — C'est normal : ton compte n'a **jamais été créé**. L'inscription est bloquée à l'étape OTP (`pending_registrations` existe toujours en base). Pas de compte = pas de PIN = pas de login possible.

## Actions à prendre

### Action 1 (manuelle — toi) : Configurer l'expiration OTP dans Ikoddi
- Aller sur app.ikoddi.com → ton app OTP → paramètres
- Augmenter la durée d'expiration à **5 minutes** (300 secondes)
- Vérifier aussi que le format du numéro est correct pour la Côte d'Ivoire

### Action 2 (code) : Ajouter un fallback local robuste
Quand Ikoddi envoie l'OTP avec succès mais que le verify échoue avec "OTP expired", c'est frustrant pour l'utilisateur. On va améliorer la résilience :

- **Stocker un hash du code OTP localement** en parallèle de l'otpToken Ikoddi
- Quand Ikoddi verify échoue avec "expired", tenter une vérification locale en fallback
- Cela nécessite de demander à Ikoddi de nous renvoyer le code dans la réponse send, OU de générer notre propre code et envoyer via SMS simple (pas l'API OTP managée)

**Alternative plus simple** : Basculer de l'API OTP managée d'Ikoddi vers l'envoi SMS simple avec un code généré par nous. On contrôle alors entièrement l'expiration et la vérification.

### Action 3 (code) : Nettoyer l'inscription bloquée
- Supprimer l'entrée `pending_registrations` pour +2250777992271
- Réinitialiser les `login_attempts` (actuellement bloqué à 6 tentatives)

## Plan d'implémentation recommandé

### Fichiers impactés

| Fichier | Changement |
|---|---|
| `supabase/functions/phone-auth/index.ts` | Remplacer l'API OTP managée d'Ikoddi par envoi SMS simple + vérification locale |
| Migration SQL | Nettoyer pending_registrations et login_attempts pour le numéro test |

### Détail technique

Au lieu d'utiliser l'endpoint `/otp/{appId}/sms/{identity}` (OTP managé par Ikoddi), on va :

1. **Générer le code OTP nous-mêmes** (6 chiffres aléatoires)
2. **L'envoyer par SMS simple** via l'API Ikoddi `/sms` (envoi de message texte classique)
3. **Stocker le hash du code** dans `pending_registrations.otp_code` (format `HASH:salt:hash`)
4. **Vérifier localement** — plus de dépendance à l'API verify d'Ikoddi

Avantages :
- Contrôle total de l'expiration (nos 5 minutes, pas celles d'Ikoddi)
- Pas de problème de "OTP expired" côté Ikoddi
- Le fallback dev (mode test) continue de fonctionner identiquement
- L'envoi SMS reste via Ikoddi (même coût, même route)

