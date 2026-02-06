

# Diagnostic complet : Commandes, Livraisons et Annulations

## Resultats des tests

Apres analyse approfondie du code et des donnees en base, voici les problemes identifies :

---

## Probleme 1 (CRITIQUE) : Donnees manquantes pour le dialog d'annulation livreur

La requete `myDeliveries` ne recupere que 3 champs de la commande :
```
order:orders!order_id (id, payment_method, payment_status)
```

Mais le `DriverCancellationDialog` utilise `delivery.order.user_id`, `delivery.order.subtotal`, `delivery.order.total_amount`, et `delivery.order.payment_reference` qui sont **tous `undefined`**. Cela signifie :
- Les refunds sont crees avec `amount: undefined`, `net_refund: undefined`
- Les penalites sont creees avec `user_id: undefined` (echec RLS garanti)
- Le process d'annulation ne fonctionne pas correctement

**Fix** : Ajouter les champs manquants dans la requete (ligne 104) :
```
order:orders!order_id (id, payment_method, payment_status, user_id, subtotal, total_amount, payment_reference)
```

---

## Probleme 2 (IMPORTANT) : Delivery request non creee pour certaines commandes

La commande `ORD-20260206-912B6965` n'a aucune `delivery_request` associee. Le code dans `Checkout.tsx` (lignes 288-290) log l'erreur mais ne bloque pas la commande :
```typescript
if (deliveryError) {
  console.error("Error creating delivery request:", deliveryError);
  // La commande est creee mais le livreur ne la verra JAMAIS
}
```

**Fix** : Faire echouer la commande si la delivery request ne peut pas etre creee (throw l'erreur).

---

## Probleme 3 (MINEUR) : Code mort dans getNextStatusAction

Ligne 230 du `DriverDeliveriesSection.tsx` est inatteignable (return avant) :
```typescript
case "arrived":
  return { ... showPaymentOptions: true };  // ligne 229
  return { ... nextStatus: "delivered" };     // ligne 230 - JAMAIS executee
```

---

## A propos du probleme "confirmer une livraison confirme toutes les autres"

Apres analyse du code ET des donnees :
- Chaque mutation filtre correctement par `delivery.id` (cle primaire)
- Les deux livraisons d'aujourd'hui ont ete acceptees a 7 secondes d'intervalle (manuellement)
- Aucun trigger ne provoque de mise a jour en cascade
- Les statuts sont differents (in_progress vs assigned), prouvant qu'elles sont independantes

Le comportement observe pourrait s'expliquer par le fait que les deux commandes d'un panier multi-vendeur partagent le meme `payment_group_id`, et que les deux apparaissent comme "confirmees" car le trigger DB mappe `assigned` et `in_progress` vers le statut order `confirmed`.

---

## Plan d'implementation

### Fichier 1 : `src/components/driver/DriverDeliveriesSection.tsx`

| Ligne | Changement |
|-------|-----------|
| 104 | Ajouter `user_id, subtotal, total_amount, payment_reference` dans la requete order |
| 229-230 | Supprimer la ligne morte (230) |

### Fichier 2 : `src/pages/Checkout.tsx`

| Ligne | Changement |
|-------|-----------|
| 288-290 | Remplacer `console.error` par `throw deliveryError` pour que l'echec de creation de delivery request fasse echouer la commande |

### Fichier 3 : `src/components/driver/DriverCancellationDialog.tsx`

| Ligne | Changement |
|-------|-----------|
| 86 | Ajouter `.eq("driver_id", userId)` pour securiser la mise a jour |

---

## Details techniques

- Le `DriverCancellationDialog` est le composant le plus impacte : sans les donnees `user_id`, `subtotal`, etc., le flow d'annulation cree des enregistrements invalides en base
- Le delivery request manquant (ordre ORD-20260206-912B6965) devra etre cree manuellement ou l'ordre annule par un admin
- Le code mort sur ligne 230 est inoffensif mais genere de la confusion lors de la maintenance

