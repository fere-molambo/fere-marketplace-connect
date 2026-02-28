

# Ajouter la creation de membre equipe dans le dialog existant

## Probleme
Le dialog "Ajouter un membre d'equipe" dans l'onglet Config de la boutique permet uniquement de selectionner un membre existant. Si le vendeur n'a cree aucun utilisateur equipe au prealable, il voit "Aucun membre d'equipe disponible" et ne peut rien faire.

## Solution
Ajouter un bouton "Creer un nouveau membre" dans le dialog existant (`ConfigTab.tsx`). Au clic, un sous-formulaire apparait (nom, email, contact, mot de passe). La creation appelle l'edge function `create-user` avec `role: 'equipe'`. Apres creation, le nouveau membre apparait automatiquement dans la liste des membres disponibles pour etre assigne a la boutique.

## Changements — `src/components/shops/tabs/ConfigTab.tsx`

### 1. Ajouter un etat `showCreateForm` (boolean)
Toggle entre la liste de selection et le formulaire de creation.

### 2. Ajouter le formulaire de creation
Champs : nom complet, email, contact, mot de passe. Bouton "Creer et ajouter". Appel :
```ts
await supabase.functions.invoke('create-user', {
  body: { email, password, nom_complet, contact, role: 'equipe' }
});
```

### 3. Apres creation reussie
- Rafraichir la liste `availableMembers` via `queryClient.invalidateQueries`
- Revenir a la vue de selection avec le nouveau membre pre-selectionne
- OU directement inserer dans `shop_team_members` si un tag est deja choisi

### 4. UI dans le dialog
- En haut du dialog : lien/bouton "Creer un nouveau membre" quand `showCreateForm = false`
- Quand `showCreateForm = true` : formulaire + bouton retour vers la liste
- Le message "Aucun membre disponible" est accompagne du bouton de creation

Aucun nouveau fichier, aucune nouvelle route, aucune migration necessaire.

