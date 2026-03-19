

# Plan approuvé — 2 parties

## Partie 1 : Corrections côté Lovable (à implémenter maintenant)

### 1a. Fix `generateInternalPassword()` dans `phone-auth/index.ts` (ligne 742-746)
Remplacer par `return crypto.randomUUID();`

### 1b. Fix sender SMS Ikoddi (ligne 141)
Changer `from: 'Fere'` en `from: 'Ikoddi'`

### 1c. Mettre à jour `docs/BOLT_CLIENT_APP.md` (lignes 20-49)
Remplacer la section auth email/password par le flux phone-auth Edge Function.

### 1d. Mettre à jour `docs/BOLT_DRIVER_APP.md` (lignes 20-33)
Idem avec `role: "livreur"` et auto-inscription.

### 1e. Mettre à jour `docs/MOBILE_API_REFERENCE.md` section Auth (~lignes 370-400)
Remplacer par le flux phone-auth.

---

## Partie 2 : Texte exact à copier-coller dans Bolt.new

Voici le message à envoyer à Bolt.new (pour les DEUX apps — client et livreur) :

---

**⚠️ CORRECTION CRITIQUE — Authentification**

L'authentification a été mise à jour côté backend. Il faut **supprimer tout le code qui utilise `supabase.auth.signUp()` et `supabase.auth.signInWithPassword()` directement**. Toute l'authentification passe désormais par une Edge Function appelée `phone-auth`.

**INSCRIPTION (nouveau compte) :**

```typescript
// Étape 1 : Enregistrer l'utilisateur (envoie un SMS OTP)
const { data, error } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "register",
    phone: "+2250777992271",  // format international avec + obligatoire
    full_name: "Nom Complet",
    pin: "123456",            // exactement 6 chiffres
    role: "membre",           // "membre" pour client, "livreur" pour livreur, "vendeur" pour vendeur
    email: ""                 // optionnel, laisser vide si pas d'email
  }
});

if (data?.success) {
  // Un SMS avec un code OTP a été envoyé au numéro
  // Afficher l'écran de saisie OTP
  // En mode dev/test : le code est dans data.dev_otp (si le SMS échoue)
}

// Étape 2 : Vérifier le code OTP reçu par SMS
const { data: verifyData } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "verify-registration",
    phone: "+2250777992271",
    otp: "123456"  // code reçu par SMS
  }
});

if (verifyData?.success) {
  // Compte créé ! L'utilisateur doit maintenant se connecter
  // Rediriger vers l'écran de connexion
}
```

**CONNEXION :**

```typescript
const { data, error } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "login",
    phone: "+2250777992271",
    pin: "123456"
  }
});

if (data?.success && data?.session) {
  // OBLIGATOIRE : établir la session Supabase avec les tokens retournés
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  // L'utilisateur est maintenant connecté
  // Rediriger vers l'écran principal
}
```

**RÉINITIALISATION DU PIN (mot de passe oublié) :**

```typescript
// Étape 1 : Demander un code OTP par SMS
const { data } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "reset-pin-request",
    phone: "+2250777992271"
  }
});

// Étape 2 : Confirmer avec le code OTP + nouveau PIN
const { data: confirmData } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "reset-pin-confirm",
    phone: "+2250777992271",
    otp: "123456",
    new_pin: "654321"
  }
});
```

**DÉCONNEXION :**

```typescript
await supabase.auth.signOut();
```

**RÉCUPÉRER LE PROFIL :**

```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();
```

**RÉCUPÉRER LE RÔLE :**

```typescript
const { data: roles } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id);
```

**RÈGLES OBLIGATOIRES :**
1. Le numéro de téléphone doit TOUJOURS être au format international avec le `+` (ex: `+2250777992271`)
2. Le PIN est TOUJOURS exactement 6 chiffres
3. Le rôle pour les clients est `"membre"` (PAS `"client"`)
4. Le rôle pour les livreurs est `"livreur"`
5. Le rôle pour les vendeurs est `"vendeur"`
6. Ne JAMAIS appeler `supabase.auth.signUp()` directement
7. Ne JAMAIS appeler `supabase.auth.signInWithPassword()` directement
8. Après un login réussi, TOUJOURS appeler `supabase.auth.setSession()` avec les tokens retournés par la Edge Function
9. Pour vérifier si l'utilisateur est connecté : `supabase.auth.getUser()`
10. Pour écouter les changements d'état : `supabase.auth.onAuthStateChange()`

Remplace TOUTE la logique d'authentification existante par ce nouveau flux. Les écrans d'inscription et de connexion doivent utiliser le numéro de téléphone + PIN (pas email + mot de passe).

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/phone-auth/index.ts` | Fix UUID + fix sender SMS |
| `docs/BOLT_CLIENT_APP.md` | Section auth → phone-auth |
| `docs/BOLT_DRIVER_APP.md` | Section auth → phone-auth |
| `docs/MOBILE_API_REFERENCE.md` | Section auth → phone-auth |

