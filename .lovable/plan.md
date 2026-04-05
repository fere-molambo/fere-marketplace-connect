

# Correction : Boutique reste "inactive" apres activation par l'admin

## Probleme identifie

Il y a deux champs distincts sur la table `shops` :
- **`is_active`** (boolean, defaut `true`) : utilise par l'app mobile pour afficher/masquer la boutique
- **`verification_status`** (string : `pending`, `verified`, `rejected`) : utilise par l'admin pour valider la boutique

Quand l'admin clique "Activer" sur le dashboard web, seul `verification_status` passe a `verified`. Le champ `is_active` reste inchange. L'app mobile verifie probablement `is_active` (ou les deux), d'ou le message "Boutique inactive".

## Correction cote web (Lovable)

Dans `ShopDetail.tsx`, la fonction `updateStatus` sera modifiee pour aussi mettre a jour `is_active` :
- `verified` → `is_active = true`
- `rejected` ou `pending` → `is_active = false`

## Prompt pour Bolt.new

Voici ce que tu dois dire a Bolt.new :

---

**Correction : logique d'affichage "Boutique inactive"**

Actuellement, l'app mobile affiche "Boutique inactive - activez-la dans les parametres" en se basant sur le champ `is_active` de la table `shops`. Cependant, l'activation d'une boutique par un admin se fait via le champ `verification_status`.

**Changements a effectuer :**

1. **Remplacer la verification** : au lieu de verifier uniquement `is_active`, verifier `verification_status`. Une boutique est operationnelle quand `verification_status === 'verified'`.

2. **Adapter le bandeau d'alerte** :
   - Si `verification_status === 'pending'` → afficher "Votre boutique est en attente de validation par l'equipe Fere. Vous serez notifie une fois qu'elle sera activee."
   - Si `verification_status === 'rejected'` → afficher "Votre boutique a ete rejetee. Contactez le support pour plus d'informations."
   - Si `verification_status === 'verified'` → ne rien afficher (boutique operationnelle)

3. **Supprimer le message "activez-la dans les parametres"** : le vendeur ne peut PAS activer sa propre boutique. C'est l'admin qui le fait depuis le dashboard. Le vendeur doit juste attendre.

4. **Ne PAS ajouter de bouton d'activation dans les parametres du vendeur** : ce n'est pas au vendeur d'activer sa boutique.

5. **Requete Supabase** : quand vous chargez la boutique du vendeur, incluez `verification_status` dans le SELECT :
```sql
SELECT *, verification_status FROM shops WHERE owner_id = user_id
```

6. **Condition de visibilite publique** : les produits et services ne doivent etre visibles pour les clients QUE si `verification_status = 'verified'` ET `is_active = true`.

---

## Fichiers modifies cote Lovable

| Fichier | Modification |
|---|---|
| `src/pages/ShopDetail.tsx` | `updateStatus` met aussi a jour `is_active` en fonction du statut |

