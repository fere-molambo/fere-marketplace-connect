
# Corrections de coherence du flux complet

## Problemes identifies

### 1. OrderDetailSheet (vue vendeur) : mauvaise source pour le return_status

Le `OrderDetailSheet` (ligne 36-48) requete le `return_status` depuis la livraison **originale** (`is_return: false`). Or, la livraison originale n'a que `return_status: "returning"` (defini a l'annulation). Le suivi reel du retour (`en_route_vendor` -> `arrived_vendor` -> `returned`) est stocke sur la livraison **retour** (`is_return: true`).

Resultat : le `CancellationBanner` ne montre aucune etape active pendant le retour, car `"returning"` ne correspond a aucun des 3 steps du tracker.

**Correction** : Modifier la requete pour chercher la livraison retour (`is_return: true`) au lieu de l'originale. La livraison retour contient le `return_status` precis (`en_route_vendor`, `arrived_vendor`, `returned`).

### 2. Driver : "Livraison terminée" affiche pour les retours completes

Ligne 576-581 de `DriverDeliveriesSection.tsx`, dans la section "Mes livraisons" actives :

```
{delivery.status === "delivered" && (
  <div>Livraison terminée</div>
)}
```

Ce bloc ne verifie pas `is_return`. Pour un retour complete (`status: "delivered"`), il afficherait "Livraison terminée" au lieu de "Retour terminé". Bien que les retours completes passent normalement a l'historique, il vaut mieux securiser ce cas.

**Correction** : Ajouter une condition `!delivery.is_return` pour le message standard, et afficher "Retour confirmé" si `is_return`.

### 3. Driver : gains affiches pour les retours dans l'historique

Lignes 663-668 : les gains sont affiches si `delivery.driver_earnings > 0 && delivery.status === "delivered"`. Un retour pourrait heriter de `driver_earnings` de la requete originale (selon la creation). Il faut exclure les retours (`is_return`) de l'affichage des gains pour eviter un double comptage.

**Correction** : Ajouter `&& !delivery.is_return` a la condition d'affichage des gains.

### 4. Driver : total du jour inclut potentiellement les retours

Lignes 615-620 : le calcul du total quotidien filtre sur `status === "delivered"` sans exclure `is_return`. Les retours completes (avec `status: "delivered"`) pourraient gonfler le total.

**Correction** : Ajouter `&& !d.is_return` au filtre.

## Fichiers modifies

### `src/components/orders/OrderDetailSheet.tsx`

Ligne 43 : changer `eq("is_return", false)` en `eq("is_return", true)` pour recuperer le `return_status` de la livraison retour.

### `src/components/driver/DriverDeliveriesSection.tsx`

- Ligne 576-581 : Conditionner le message "Livraison terminée" / "Retour confirmé" sur `is_return`
- Ligne 616-618 : Exclure `is_return` du filtre des gains du jour
- Ligne 663-665 : Exclure `is_return` de l'affichage des gains dans l'historique

## Resume de la coherence

Apres ces corrections, le flux complet sera coherent :

```text
Etape                    | Client              | Livreur              | Vendeur
-------------------------|----------------------|----------------------|------------------------
Commande creee           | Pending              | -                    | Commande recue
Acompte paye             | Acompte paye         | -                    | Acompte paye
Livreur accepte          | Assignee             | Acceptee             | En cours
Pickup                   | Recuperee            | Colis recupere       | En transit
En route client          | En route             | Vers client          | En transit
Arrivee                  | Boutons payer/annuler| Attente client       | En transit
Client annule            | Annulee              | Notifie, retour      | Annulee + retour
Retour en route          | -                    | Badge "Retour"       | Tracker: En route
Retour arrive vendeur    | -                    | Attente vendeur      | Tracker: Arrive
Vendeur confirme         | -                    | Badge "Retourné"     | Tracker: Retourné
```
