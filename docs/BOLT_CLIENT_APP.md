# Instructions Bolt.new — Application Client Fere

> Ce document contient toutes les instructions pour créer l'application mobile des clients avec Bolt.new, connectée au backend Supabase existant.

---

## 🔗 Connexion Supabase

```typescript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jajfuajmkjulujnwfqen.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphamZ1YWpta2p1bHVqbndmcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjY3MzUsImV4cCI6MjA3OTA0MjczNX0.ME5XNJsLbB0InLeKexBcIGe5sxZZsd6Jg2W9oB0IBEQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## 🔐 Authentification (Phone + PIN via Edge Function)

> **⚠️ IMPORTANT** : Ne JAMAIS utiliser `supabase.auth.signUp()` ni `supabase.auth.signInWithPassword()` directement. Toute l'authentification passe par la Edge Function `phone-auth`.

> **🔑 OTP géré par Ikoddi** : L'OTP est généré, envoyé et vérifié par Ikoddi (OTP As A Service). Le backend ne retourne JAMAIS le code OTP au frontend. Le champ `dev_otp` n'existe plus.

> **📱 Tests App Store / Play Store** : Une liste blanche Ikoddi est configurée avec des numéros de test pour les reviewers Apple et Google. Ces numéros reçoivent automatiquement un OTP prédéfini sans passer par un vrai SMS.

### Inscription (nouveau client)

```typescript
// Étape 1 : Enregistrer l'utilisateur (envoie un SMS OTP via Ikoddi)
const { data, error } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "register",
    phone: "+2250777992271",  // format international avec + obligatoire
    full_name: "Jean Dupont",
    pin: "123456",            // exactement 6 chiffres
    role: "membre",           // TOUJOURS "membre" pour les clients
    email: ""                 // optionnel
  }
});

// Réponse : { success: true, sms_sent: true, message: "..." }
// Si sms_sent === false → l'envoi SMS a échoué, l'utilisateur doit réessayer
// Il n'y a PAS de dev_otp. L'OTP est envoyé par SMS uniquement.

if (data?.success && data?.sms_sent) {
  // Rediriger vers l'écran de saisie OTP
}

// Étape 2 : Vérifier le code OTP reçu par SMS
const { data: verifyData } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "verify-registration",
    phone: "+2250777992271",
    otp: "123456"  // code reçu par SMS (6 chiffres)
  }
});

// Réponse : { success: true, message: "Compte créé avec succès..." }
if (verifyData?.success) {
  // Compte créé ! Rediriger vers l'écran de connexion
}
```

### Connexion

```typescript
const { data, error } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "login",
    phone: "+2250777992271",
    pin: "123456"
  }
});

// Réponse : { success: true, session: { access_token, refresh_token, user } }
if (data?.success && data?.session) {
  // OBLIGATOIRE : établir la session Supabase avec les tokens NESTED
  await supabase.auth.setSession({
    access_token: data.session.access_token,   // PAS data.access_token
    refresh_token: data.session.refresh_token,  // PAS data.refresh_token
  });
}

// ⚠️ En cas de compte bloqué (brute-force, 5 tentatives) :
// Réponse HTTP 429 : { success: false, error: "...", blocked_until: "...", remaining_seconds: 180 }
```

### Réinitialisation du PIN (self-service via OTP)

```typescript
// Étape 1 : Demander un code OTP (envoyé par SMS via Ikoddi)
const { data } = await supabase.functions.invoke("phone-auth", {
  body: { action: "reset-pin-request", phone: "+2250777992271" }
});
// Réponse : { success: true, sms_sent: true }

// Étape 2 : Confirmer avec le code + nouveau PIN
const { data: confirmData } = await supabase.functions.invoke("phone-auth", {
  body: {
    action: "reset-pin-confirm",
    phone: "+2250777992271",
    otp: "123456",       // code reçu par SMS
    new_pin: "654321"    // nouveau PIN (6 chiffres)
  }
});
// Réponse : { success: true, message: "PIN réinitialisé avec succès..." }
```

### Demander une réinitialisation admin

```typescript
// Si l'utilisateur n'a pas accès à son numéro, il peut demander à un admin
const { data } = await supabase.functions.invoke("phone-auth", {
  body: { action: "request-admin-reset", phone: "+2250777992271" }
});
// L'admin verra la demande et pourra réinitialiser le PIN à 123456
```

### Déconnexion

```typescript
await supabase.auth.signOut();
```

### Récupérer le profil et le rôle

```typescript
const { data: { user } } = await supabase.auth.getUser();

// Profil (table profiles) — clés : nom_complet, contact (PAS full_name, PAS phone)
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();

// Rôle (table user_roles)
const { data: roles } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id);

const userRole = roles?.[0]?.role; // "membre", "vendeur", "livreur", "equipe"
```

### Redirection selon le rôle

```typescript
// Après login, rediriger selon le rôle :
switch (userRole) {
  case "membre":
    // → Écran client (catalogue, panier, commandes)
    break;
  case "vendeur":
  case "equipe":
    // → Interface vendeur (gestion boutique, produits, commandes)
    break;
  case "livreur":
    // → Interface livreur (livraisons disponibles, carte)
    break;
}
```

### Règles obligatoires
1. Téléphone au format international avec `+` (ex: `+2250777992271` pour CI, `+22370000000` pour Mali)
2. PIN = exactement 6 chiffres
3. Rôle client = `"membre"` (PAS `"client"`)
4. Après login, TOUJOURS appeler `supabase.auth.setSession()` avec `data.session.access_token` et `data.session.refresh_token` (tokens **nested** dans `session`)
5. Ne JAMAIS appeler `supabase.auth.signUp()` ou `supabase.auth.signInWithPassword()`
6. Ne JAMAIS chercher `data.access_token` directement — c'est `data.session.access_token`
7. Les métadonnées utilisateur utilisent `nom_complet` et `contact` (PAS `full_name`, PAS `phone`)
8. L'indicatif par défaut doit être `+225` (Côte d'Ivoire) avec possibilité de choisir `+223` (Mali)

### Mettre à jour le profil

```typescript
await supabase
  .from("profiles")
  .update({
    nom_complet: "Nouveau Nom",
    contact: "+22370000001",
    adresse: "Bamako, Mali",
  })
  .eq("id", userId);
```

---

## 📱 Écrans de l'application

### 1. Catalogue — Produits

```typescript
// Produits actifs avec infos boutique
const { data: products } = await supabase
  .from("products")
  .select(`
    *,
    shops(id, name, logo_url, is_official, delivery_zone_id, geolocation_lat, geolocation_lng, address),
    category:product_categories!category_id(id, name)
  `)
  .eq("is_active", true)
  .order("created_at", { ascending: false });
```

#### Filtres disponibles

```typescript
// Par catégorie
.eq("category_id", categoryId)

// Par type de prix
.eq("price_type", "fixe") // ou "negoce" ou "en_gros"

// Par recherche texte
.ilike("name", `%${searchTerm}%`)

// Par boutique
.eq("shop_id", shopId)
```

#### Ventes flash

```typescript
const { data: flashSales } = await supabase
  .from("flash_sales")
  .select("*, products(*), services(*)")
  .eq("is_active", true)
  .gt("ends_at", new Date().toISOString());
```

### 2. Catalogue — Services

```typescript
const { data: services } = await supabase
  .from("services")
  .select(`
    *,
    shops(id, name, logo_url, is_official)
  `)
  .eq("is_active", true)
  .eq("requires_booking", true);
```

### 3. Détail boutique

```typescript
const { data: shop } = await supabase
  .from("shops")
  .select("*")
  .eq("id", shopId)
  .single();

// Produits de la boutique
const { data: shopProducts } = await supabase
  .from("products")
  .select("*")
  .eq("shop_id", shopId)
  .eq("is_active", true);
```

---

## 🛒 Panier

Le panier est **persisté dans localStorage** (pas en base de données).

### Structure du panier

```typescript
interface CartItem {
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    price_type: "fixe" | "negoce" | "en_gros";
    discount_percent: number | null;
    min_quantity: number | null;
    min_auto_price: number | null;
    quantity_intervals: { min: number; max: number; price: number }[] | null;
    main_media_url: string | null;
    shops: {
      id: string;
      name: string;
      logo_url: string | null;
      delivery_zone_id: string | null;
      geolocation_lat: number | null;
      geolocation_lng: number | null;
      address: string | null;
    };
  };
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  proposedPrice?: number; // pour les prix "negoce"
  unitPrice: number;
  totalPrice: number;
}
```

### Système de prix

#### 1. Prix fixe (`price_type: "fixe"`)
```typescript
let unitPrice = product.price;
if (product.discount_percent > 0) {
  unitPrice = unitPrice * (1 - product.discount_percent / 100);
}
```

#### 2. Prix négocié (`price_type: "negoce"`)
Le client propose un prix. Validation :
```typescript
// Le prix proposé doit être >= min_auto_price du vendeur
if (proposedPrice < product.min_auto_price) {
  // Erreur : "Le prix est en-dessous du minimum du vendeur"
}
unitPrice = proposedPrice;
```

#### 3. Prix en gros (`price_type: "en_gros"`)
Le prix dépend de la quantité commandée :
```typescript
const intervals = product.quantity_intervals; // [{ min: 1, max: 10, price: 5000 }, { min: 11, max: 50, price: 4000 }]

for (const interval of intervals) {
  if (quantity >= interval.min && quantity <= interval.max) {
    unitPrice = interval.price;
    break;
  }
}
// Quantité minimum obligatoire : product.min_quantity
```

### Persistance localStorage

```typescript
const CART_KEY = "fere_cart";

// Sauvegarder
localStorage.setItem(CART_KEY, JSON.stringify(items));

// Charger
const saved = localStorage.getItem(CART_KEY);
const items = saved ? JSON.parse(saved) : [];
```

---

## 💳 Checkout — Paiement en 2 étapes

### Concept clé

Le client paie en **2 temps** :
1. **Acompte** (en ligne via Paystack) = frais de livraison + commissions plateforme + frais Paystack (1%)
2. **Solde** (en ligne via Paystack à l'arrivée du livreur) = montant des produits + frais Paystack (1%)

### Étape 1 : Sélection de l'adresse de livraison

```typescript
// Récupérer les adresses du client
const { data: addresses } = await supabase
  .from("delivery_addresses")
  .select("*")
  .eq("user_id", userId)
  .order("is_default", { ascending: false });

// Créer une nouvelle adresse
const { data: newAddress } = await supabase
  .from("delivery_addresses")
  .insert({
    user_id: userId,
    label: "Maison",
    address: "Quartier Hippodrome, Bamako",
    geolocation_lat: 12.6392,
    geolocation_lng: -8.0029,
    recipient_name: "Jean Dupont",
    recipient_phone: "+22370000000",
    is_default: true,
  })
  .select()
  .single();
```

**Important** : Les coordonnées GPS (`geolocation_lat`, `geolocation_lng`) sont **obligatoires** pour le calcul des frais de livraison.

### Étape 2 : Calcul des frais de livraison

Le calcul utilise l'edge function `calculate-distance` :

```typescript
// Calculer la distance entre les points de collecte et le client
const { data: distanceResult } = await supabase.functions.invoke("calculate-distance", {
  body: {
    origins: [{ lat: shopLat, lng: shopLng }],
    destinations: [{ lat: clientLat, lng: clientLng }],
  },
});

// Récupérer les paramètres de livraison
const { data: settings } = await supabase
  .from("platform_settings")
  .select("delivery_base_fee, delivery_fee_per_km, delivery_discount_per_km, delivery_commission_fere, delivery_commission_driver")
  .single();

// Formule de calcul des frais de livraison
const distanceKm = totalDistanceMeters / 1000;
const baseFee = settings.delivery_base_fee; // ex: 500 FCFA
const perKmFee = settings.delivery_fee_per_km; // ex: 200 FCFA/km
const discountPerKm = settings.delivery_discount_per_km; // ex: 5 FCFA/km
const effectivePerKm = Math.max(perKmFee - discountPerKm * distanceKm, perKmFee * 0.3);
const deliveryFee = Math.round(baseFee + effectivePerKm * distanceKm);
```

### Étape 3 : Calcul des commissions

```typescript
// Récupérer les taux de commission par catégorie
const { data: commissions } = await supabase
  .from("category_commissions")
  .select("category_id, commission_rate, commission_type");

// Commission sur les produits
const getCommissionRate = (categoryId: string): number => {
  const specific = commissions.find((c) => c.category_id === categoryId);
  if (specific) return specific.commission_rate;
  const global = commissions.find((c) => c.commission_type === "all_products");
  return global?.commission_rate || 10; // 10% par défaut
};

const productCommission = items.reduce((sum, item) => {
  const rate = getCommissionRate(item.product.category_id) / 100;
  return sum + Math.round(item.totalPrice * rate);
}, 0);

// Commission sur la livraison
const deliveryCommissionFere = Math.round(deliveryFee * (settings.delivery_commission_fere / 100));
```

### Étape 4 : Montants finaux

```typescript
// ACOMPTE (payé immédiatement en ligne)
const advanceRaw = deliveryFee + deliveryCommissionFere + productCommission;
const advancePaystackFees = Math.ceil(advanceRaw * 0.01); // 1% frais Paystack
const advanceAmount = advanceRaw + advancePaystackFees;

// SOLDE (payé à l'arrivée du livreur, en ligne)
const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
const balancePaystackFees = Math.ceil(subtotal * 0.01);
const balanceAmount = subtotal + balancePaystackFees;
```

### Étape 5 : Créer la commande

**Règle** : 1 commande = 1 boutique. Si le panier contient des produits de plusieurs boutiques, créer une commande par boutique.

```typescript
// Grouper par boutique
const itemsByShop: Record<string, CartItem[]> = {};
items.forEach((item) => {
  const shopId = item.product.shops.id;
  if (!itemsByShop[shopId]) itemsByShop[shopId] = [];
  itemsByShop[shopId].push(item);
});

// Pour chaque boutique, créer une commande
for (const [shopId, shopItems] of Object.entries(itemsByShop)) {
  // Générer le numéro de commande
  const { data: orderNumber } = await supabase.rpc("generate_order_number");

  // Calculer les montants par boutique
  const shopSubtotal = shopItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const shopDeliveryFee = totalDeliveryFee / shopCount;
  const shopCommission = shopItems.reduce((sum, item) => {
    const rate = getCommissionRate(item.product.category_id) / 100;
    return sum + Math.round(item.totalPrice * rate);
  }, 0);

  // Créer la commande
  const { data: order } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: userId,
      shop_id: shopId,
      delivery_type: "delivery",
      delivery_address_id: selectedAddressId,
      delivery_fee: shopDeliveryFee,
      subtotal: shopSubtotal,
      tva_amount: Math.round(shopSubtotal * 0.18),
      commission_amount: shopCommission,
      total_amount: shopSubtotal + shopDeliveryFee,
      advance_amount: shopAdvanceAmount,
      balance_amount: shopBalanceAmount,
      advance_paid: 0,
      payment_method: "advance",
      payment_status: "pending",
      balance_payment_status: "pending",
      payment_group_id: paymentGroupId, // même ID pour toutes les commandes du même checkout
    })
    .select()
    .single();

  // Créer les items de la commande
  const orderItems = shopItems.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    shop_id: shopId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    commission_rate: getCommissionRate(item.product.category_id),
    commission_amount: Math.round(item.totalPrice * (getCommissionRate(item.product.category_id) / 100)),
    selected_color: item.selectedColor,
    selected_size: item.selectedSize,
    proposed_price: item.proposedPrice,
  }));

  await supabase.from("order_items").insert(orderItems);

  // Créer la demande de livraison
  const driverEarnings = Math.round(shopDeliveryFee * (settings.delivery_commission_driver / 100));

  await supabase.from("delivery_requests").insert({
    order_id: order.id,
    zone_id: shopItems[0].product.shops.delivery_zone_id,
    status: "pending",
    pickup_point: {
      shop_id: shopId,
      shop_name: shopItems[0].product.shops.name,
      lat: shopItems[0].product.shops.geolocation_lat,
      lng: shopItems[0].product.shops.geolocation_lng,
      address: shopItems[0].product.shops.address,
    },
    delivery_point: {
      lat: selectedAddress.geolocation_lat,
      lng: selectedAddress.geolocation_lng,
      address: selectedAddress.address,
      recipient_name: selectedAddress.recipient_name,
      recipient_phone: selectedAddress.recipient_phone,
    },
    delivery_fee: shopDeliveryFee,
    driver_earnings: driverEarnings,
  });
}
```

### Étape 6 : Paiement de l'acompte

```typescript
const { data } = await supabase.functions.invoke("paystack-payment", {
  body: {
    action: "initialize",
    amount: advanceAmount,
    email: userEmail,
    payment_type: "order",
    related_id: firstOrderId, // ID de la première commande
    metadata: {
      payment_group_id: paymentGroupId,
      is_advance: true,
    },
    callback_url: "https://votre-app.com/payment/callback",
  },
});

// Rediriger vers data.authorization_url pour le paiement Paystack
```

### Étape 7 : Vérification du paiement (callback)

Après redirection Paystack, le client revient avec `?reference=XXX` :

```typescript
const { data } = await supabase.functions.invoke("paystack-payment", {
  body: {
    action: "verify",
    reference: referenceFromUrl,
  },
});

if (data.status === "success") {
  // Acompte payé ! La commande passe à "pending" et attend un livreur.
  // Le trigger DB `sync_order_payment_from_transaction` met à jour automatiquement :
  // - payment_status → "partial"
  // - advance_paid → montant
}
```

---

## 📦 Suivi de commande en temps réel

### Récupérer les commandes du client

```typescript
const { data: orders } = await supabase
  .from("orders")
  .select(`
    *,
    order_items(*, products(name, main_media_url)),
    delivery_addresses(*),
    shops(name, logo_url)
  `)
  .eq("user_id", userId)
  .order("created_at", { ascending: false });
```

### Suivi de livraison (7 étapes)

```typescript
const { data: deliveries } = await supabase
  .from("delivery_requests")
  .select("*")
  .eq("order_id", orderId)
  .eq("is_return", false);

// Afficher un tracker visuel basé sur delivery.status
```

```
[Commande]──[Confirmée]──[En transit]──[Récupéré]──[En route]──[Arrivé]──[Livré]
    ●            ●             ●            ●          ●          ●         ○
```

### Actions du client à l'arrivée du livreur

Quand `delivery.status === "arrived"` :

#### Option A : Payer le solde (colis OK)

```typescript
const { data } = await supabase.functions.invoke("paystack-payment", {
  body: {
    action: "initialize",
    amount: order.balance_amount, // Le serveur vérifie ce montant
    email: userEmail,
    payment_type: "order_balance",
    related_id: orderId,
    metadata: {
      order_number: order.order_number,
      is_balance_payment: true,
    },
    callback_url: "https://votre-app.com/payment/callback",
  },
});

// Le trigger DB marque automatiquement :
// - payment_status → "paid"
// - delivery status → "delivered"
// - Crée les pending_payouts pour le vendeur et le livreur
```

#### Option B : Annuler la commande (problème avec le colis)

Voir section Annulation ci-dessous.

---

## ❌ Annulation

### Quand le client peut annuler

- **Avant le pickup** : à tout moment (statuts `pending`, `assigned`, `in_progress`)
- **À l'arrivée** : quand le livreur est arrivé (`arrived`) et que le solde n'est pas encore payé

### Récupérer les motifs d'annulation

```typescript
const { data: reasons } = await supabase
  .from("cancellation_reasons")
  .select("id, label")
  .eq("is_active", true)
  .contains("applies_to", ["client"]);
```

### Créer l'annulation

```typescript
const { data: cancellation } = await supabase
  .from("cancellations")
  .insert({
    order_id: orderId,
    cancelled_by: userId,
    canceller_role: "client",
    reason_id: selectedReasonId, // ou null si motif personnalisé
    custom_reason: customReasonText,
    attachment_url: uploadedImageUrl, // pièce jointe optionnelle (photo du colis)
    status_at_cancellation: deliveryStatus,
    requires_return: deliveryStatus === "arrived", // retour nécessaire si livreur est arrivé
    refund_amount: calculatedRefundAmount,
    delivery_fee_kept: deliveryStatus !== "pending", // frais gardés si livreur déjà en route
  })
  .select()
  .single();

// Mettre à jour la commande
await supabase
  .from("orders")
  .update({
    status: "cancelled",
    cancellation_id: cancellation.id,
  })
  .eq("id", orderId);

// Annuler la livraison
await supabase
  .from("delivery_requests")
  .update({ status: "cancelled" })
  .eq("order_id", orderId)
  .eq("is_return", false);
```

### Si retour nécessaire (livreur arrivé)

Le système crée automatiquement une livraison retour. La logique est la suivante :

```typescript
// Créer la livraison de retour
if (requires_return) {
  const originalDelivery = deliveries[0]; // livraison originale
  
  await supabase.from("delivery_requests").insert({
    order_id: orderId,
    driver_id: originalDelivery.driver_id, // même livreur
    status: "in_progress",
    return_status: "en_route_vendor",
    is_return: true,
    original_delivery_id: originalDelivery.id,
    pickup_point: {
      label: `Retour colis ${order.order_number}`,
      ...originalDelivery.delivery_point, // position du client = pickup du retour
    },
    delivery_point: originalDelivery.pickup_point, // position du vendeur = destination du retour
    delivery_fee: 0,
    driver_earnings: 0,
  });
}
```

### Upload pièce jointe (photo du colis)

```typescript
// Créer un bucket pour les pièces jointes si nécessaire
const file = selectedImage; // File from camera/gallery
const fileName = `cancellation_${Date.now()}.jpg`;

const { data: uploadData } = await supabase.storage
  .from("chat-media") // Utiliser le bucket existant
  .upload(`cancellations/${userId}/${fileName}`, file);

const { data: urlData } = supabase.storage
  .from("chat-media")
  .getPublicUrl(`cancellations/${userId}/${fileName}`);

// Utiliser urlData.publicUrl comme attachment_url dans la cancellation
```

---

## 📅 Réservation de services

Les services sont payés **en espèces** le jour de la prestation. Seuls les frais de déplacement (si applicable) sont payés en ligne.

### Flux de réservation

```
1. Choisir le service
2. Sélectionner une date disponible
3. Choisir un créneau horaire
4. Sélectionner l'adresse (lieu de la prestation)
5. Confirmer → Payer les frais de déplacement (si applicable)
```

### Récupérer les créneaux disponibles

```typescript
const service = await getServiceDetails(serviceId);
const weeklyAvailability = service.weekly_availability;
// Format: { "lundi": [{ start: "08:00", end: "12:00" }], "mardi": [...] }

// Pour une date donnée, générer les créneaux de durée = service.duration
const dayName = getDayName(selectedDate); // "lundi", "mardi", etc.
const daySlots = weeklyAvailability[dayName] || [];

const slots: TimeSlot[] = [];
daySlots.forEach((slot) => {
  let currentTime = parseTime(slot.start);
  const endTime = parseTime(slot.end);
  
  while (currentTime + service.duration <= endTime) {
    const slotStart = formatTime(currentTime);
    const slotEnd = formatTime(currentTime + service.duration);
    slots.push({ start: slotStart, end: slotEnd });
    currentTime += service.duration;
  }
});

// Vérifier les créneaux déjà réservés
const { data: existingBookings } = await supabase
  .from("service_bookings")
  .select("booking_time")
  .eq("service_id", serviceId)
  .eq("booking_date", formatDate(selectedDate))
  .neq("status", "cancelled");

const availableSlots = slots.filter(
  (s) => !existingBookings.some((b) => b.booking_time === s.start)
);
```

### Créer la réservation

```typescript
// Calculer le prix total du service (TTC + commission)
const tvaRate = platformSettings.tva_rate || 18;
const commissionRate = getServiceCommissionRate(); // ex: 10%
const tvaAmount = Math.round(servicePrice * (tvaRate / 100));
const commissionAmount = Math.round(servicePrice * (commissionRate / 100));
const totalPrice = Math.round(servicePrice + tvaAmount + commissionAmount);

// Frais de déplacement
const travelFee = service.travel_fee_type === "paid" ? service.travel_fee_amount : 0;

const { data: booking } = await supabase
  .from("service_bookings")
  .insert({
    service_id: serviceId,
    customer_id: userId,
    booking_date: formatDate(selectedDate),
    booking_time: selectedSlot.start,
    total_price: totalPrice,
    travel_fee: travelFee,
    travel_fee_paid: false,
    advance_paid: 0,
    notes: comment,
    delivery_address_id: selectedAddressId,
    payment_method: "cash",
    payment_status: travelFee > 0 ? "pending" : "not_required",
    commission_amount: commissionAmount,
    tva_amount: tvaAmount,
    status: "reserved",
  })
  .select()
  .single();

// Si frais de déplacement > 0, payer en ligne
if (travelFee > 0) {
  const { data } = await supabase.functions.invoke("paystack-payment", {
    body: {
      action: "initialize",
      amount: travelFee,
      email: userEmail,
      payment_type: "service_booking",
      related_id: booking.id,
      metadata: { is_travel_fee: true },
      callback_url: "https://votre-app.com/payment/callback",
    },
  });
  // Rediriger vers data.authorization_url
}
```

### Suivi des réservations

```typescript
const { data: bookings } = await supabase
  .from("service_bookings")
  .select(`
    *,
    services(name, main_media_url, duration, shops(name, logo_url))
  `)
  .eq("customer_id", userId)
  .order("booking_date", { ascending: false });
```

**Statuts des réservations :**
```
reserved → on_the_way → arrived → completed
                          ↓
                     cancelled
```

---

## 📍 Adresses de livraison

```typescript
// Lister les adresses
const { data: addresses } = await supabase
  .from("delivery_addresses")
  .select("*")
  .eq("user_id", userId)
  .order("is_default", { ascending: false });

// Ajouter une adresse
await supabase.from("delivery_addresses").insert({
  user_id: userId,
  label: "Bureau",
  address: "ACI 2000, Bamako",
  geolocation_lat: 12.6167,
  geolocation_lng: -7.9833,
  recipient_name: "Jean Dupont",
  recipient_phone: "+22370000000",
  is_default: false,
});

// Modifier une adresse
await supabase
  .from("delivery_addresses")
  .update({ label: "Nouveau label", address: "Nouvelle adresse" })
  .eq("id", addressId)
  .eq("user_id", userId);

// Supprimer une adresse
await supabase
  .from("delivery_addresses")
  .delete()
  .eq("id", addressId)
  .eq("user_id", userId);
```

---

## ❤️ Favoris

```typescript
// Ajouter un produit aux favoris
await supabase.from("favorites").insert({
  user_id: userId,
  product_id: productId,
});

// Ajouter un service aux favoris
await supabase.from("favorites").insert({
  user_id: userId,
  service_id: serviceId,
});

// Lister les favoris
const { data: favorites } = await supabase
  .from("favorites")
  .select(`
    *,
    products(*, shops(name, logo_url)),
    services(*, shops(name, logo_url))
  `)
  .eq("user_id", userId);

// Retirer des favoris
await supabase
  .from("favorites")
  .delete()
  .eq("id", favoriteId)
  .eq("user_id", userId);
```

---

## 💬 Messagerie

### Lister les conversations

```typescript
const { data: conversations } = await supabase
  .from("conversation_participants")
  .select(`
    conversation:conversations(
      id, last_message_at,
      participants:conversation_participants(
        user:profiles(id, nom_complet, photo_profil)
      )
    )
  `)
  .eq("user_id", userId)
  .order("conversation(last_message_at)", { ascending: false });
```

### Lire les messages

```typescript
const { data: messages } = await supabase
  .from("messages")
  .select(`
    *,
    sender:profiles!sender_id(id, nom_complet, photo_profil)
  `)
  .eq("conversation_id", conversationId)
  .order("created_at", { ascending: true });
```

### Envoyer un message

```typescript
await supabase.from("messages").insert({
  conversation_id: conversationId,
  sender_id: userId,
  content: messageText,
  media_type: "text",
  status: "sent",
});
```

### Marquer comme lu

```typescript
await supabase.rpc("mark_messages_as_read", {
  message_ids: unreadMessageIds,
});
```

### Subscription realtime

```typescript
const channel = supabase
  .channel(`chat-${conversationId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      // Nouveau message reçu
      const newMessage = payload.new;
      // Ajouter au state local
    }
  )
  .subscribe();
```

---

## 🔄 Subscriptions Realtime

### Suivi des commandes

```typescript
const channel = supabase
  .channel("client-orders")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "orders",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      const order = payload.new;
      if (order.status === "confirmed") {
        // Notification : "Votre commande est confirmée"
      } else if (order.status === "in_transit") {
        // Notification : "Votre commande est en route"
      } else if (order.status === "delivered") {
        // Notification : "Commande livrée !"
      }
    }
  )
  .subscribe();
```

### Suivi des livraisons

```typescript
supabase
  .channel("client-deliveries")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "delivery_requests",
    },
    (payload) => {
      const delivery = payload.new;
      if (delivery.status === "arrived" && !delivery.is_return) {
        // Notification : "Le livreur est arrivé ! Vérifiez votre colis."
      }
    }
  )
  .subscribe();
```

---

## 📋 Tables utilisées par le client

| Table | Usage |
|-------|-------|
| `profiles` | Profil utilisateur |
| `user_roles` | Rôle (`membre`) |
| `products` | Catalogue produits |
| `services` | Catalogue services |
| `shops` | Boutiques |
| `product_categories` | Catégories de produits |
| `flash_sales` | Ventes flash actives |
| `orders` | Commandes |
| `order_items` | Détails des commandes |
| `delivery_requests` | Suivi livraison |
| `delivery_addresses` | Adresses du client |
| `service_bookings` | Réservations de services |
| `favorites` | Produits/services favoris |
| `conversations` | Conversations |
| `conversation_participants` | Participants |
| `messages` | Messages |
| `cancellation_reasons` | Motifs d'annulation |
| `cancellations` | Annulations |
| `platform_settings` | Paramètres plateforme |
| `category_commissions` | Taux de commission |
| `reviews` | Avis sur les boutiques |

---

## 🎨 UI/UX Recommandations

1. **Accueil** : Carrousel de stories (boutiques) + ventes flash + produits récents
2. **Catalogue** : Filtres par catégorie, prix, type + recherche
3. **Panier** : Badge avec compteur sur l'icône, modal slide-up
4. **Checkout** : Résumé clair des 2 étapes de paiement (acompte + solde)
5. **Suivi** : Tracker visuel 7 étapes avec animation
6. **À l'arrivée** : Écran plein avec 2 gros boutons (Payer / Annuler)
7. **Favoris** : Swipe pour retirer
8. **Notifications push** : Quand le livreur arrive, quand la commande change de statut

---

## ⚠️ Règles métier critiques

1. **1 commande = 1 boutique** : Si le panier contient des produits de 3 boutiques, créer 3 commandes séparées avec le même `payment_group_id`.
2. **Acompte obligatoire** : Le client doit payer l'acompte en ligne via Paystack. Pas de cash pour l'acompte.
3. **Solde payé en ligne** : Le solde est aussi payé via Paystack quand le livreur arrive. Le trigger DB marque la livraison comme terminée.
4. **Services = cash** : Le prix du service est toujours payé en espèces le jour de la prestation. Seuls les frais de déplacement sont payés en ligne.
5. **Prix négocié** : Le client doit proposer un prix ≥ `min_auto_price` du vendeur.
6. **Coordonnées GPS** : L'adresse de livraison DOIT avoir des coordonnées pour calculer les frais de livraison.
7. **Anti-double booking** : Vérifier les créneaux déjà réservés avant de confirmer une réservation de service.
8. **Annulation avant pickup** : Le client peut annuler librement. Après pickup, seule l'annulation à l'arrivée est possible.
