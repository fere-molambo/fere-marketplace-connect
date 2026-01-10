# Fere Mobile API Reference

> Documentation for building mobile apps with Bolt.new using the Fere backend.

## 🔗 Supabase Connection

```typescript
// Project ID: jajfuajmkjulujnwfqen
const SUPABASE_URL = "https://jajfuajmkjulujnwfqen.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

---

## 📦 Core Tables

### `profiles`
User profile information (auto-created on auth.user signup).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | FK to auth.users |
| `nom_complet` | text | Full name |
| `email` | text | Email address |
| `contact` | text | Phone number |
| `photo_profil` | text | Avatar URL |
| `adresse` | text | Address |
| `is_available` | boolean | Driver availability flag |
| `current_lat/lng` | float | Current GPS position (drivers) |

### `user_roles`
Maps users to roles: `super_admin`, `admin`, `equipe`, `vendeur`, `livreur`, `membre`, `client`.

### `shops`
Vendor shops/stores.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Shop name |
| `owner_id` | uuid | FK to profiles |
| `logo_url` | text | Shop logo |
| `is_official` | boolean | Verified shop flag |
| `delivery_zone_id` | uuid | FK to delivery_zones |

### `products`
Physical products for sale.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `shop_id` | uuid | FK to shops |
| `name` | text | Product name |
| `price` | numeric | Base price |
| `price_type` | text | `fixe` or `negoce` |
| `discount_percent` | numeric | Active discount |
| `quantity_available` | integer | Stock count |
| `main_media_url` | text | Primary image |
| `is_active` | boolean | Published status |

### `services`
Service offerings (appointments/bookings).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `shop_id` | uuid | FK to shops |
| `name` | text | Service name |
| `price` | numeric | Base price |
| `duration` | integer | Duration in minutes |
| `requires_booking` | boolean | Always true for services |
| `travel_fee_type` | text | `free` or `paid` |
| `travel_fee_amount` | numeric | Travel fee if paid |
| `weekly_availability` | jsonb | Available time slots |

---

## 🛒 Order System

### `orders`
Product orders (1 order = 1 vendor, multi-vendor carts create multiple orders).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `order_number` | text | Display number (ORD-YYYYMMDD-XXXX) |
| `user_id` | uuid | Customer profile ID |
| `shop_id` | uuid | Vendor shop ID |
| `status` | text | See Order Workflow below |
| `payment_status` | text | `pending`, `paid`, `failed` |
| `payment_method` | text | `paystack` or `cash` |
| `subtotal` | numeric | Products total |
| `delivery_fee` | numeric | Delivery cost |
| `commission_amount` | numeric | Platform fee |
| `tva_amount` | numeric | Tax |
| `total_amount` | numeric | Final amount |

### `order_items`
Individual products in an order.

| Column | Type | Description |
|--------|------|-------------|
| `order_id` | uuid | FK to orders |
| `product_id` | uuid | FK to products |
| `shop_id` | uuid | FK to shops |
| `quantity` | integer | Quantity ordered |
| `unit_price` | numeric | Price at purchase |
| `total_price` | numeric | quantity × unit_price |

### Order Status Workflow
```
pending → confirmed → in_transit → delivered
                              ↓
                        cancelled
```

---

## 📅 Service Bookings

### `service_bookings`
Service appointment reservations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `service_id` | uuid | FK to services |
| `customer_id` | uuid | FK to profiles |
| `booking_date` | date | Appointment date |
| `booking_time` | time | Appointment time |
| `status` | text | See Booking Workflow below |
| `payment_status` | text | `pending` or `paid` |
| `payment_method` | text | Always `cash` for service price |
| `total_price` | numeric | Service price |
| `travel_fee` | numeric | Travel fee (paid online) |
| `travel_fee_paid` | boolean | True if travel fee paid |
| `commission_amount` | numeric | Platform commission |
| `delivery_address_id` | uuid | Service location |

### Booking Status Workflow
```
reserved → on_the_way → arrived → completed
                          ↓
                     cancelled
```

**Business Rules:**
- Service price: **Always cash on completion**
- Travel fee: **Paid online via Paystack** (if travel_fee_type = 'paid')
- Commission debited from vendor tokens on `completed`

---

## 🚚 Delivery System

### `delivery_requests`
Tracks package deliveries.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `order_id` | uuid | FK to orders |
| `driver_id` | uuid | Assigned driver |
| `status` | text | See Delivery Workflow |
| `delivery_fee` | numeric | Total delivery cost |
| `driver_earnings` | numeric | Driver portion |
| `pickup_point` | jsonb | Vendor coordinates |
| `delivery_point` | jsonb | Client coordinates |
| `return_status` | text | For cancelled orders |

### Delivery Status Workflow (7 steps)
```
pending → assigned → in_progress → picked_up → en_route_client → arrived → delivered
```

### Return Workflow (cancelled after pickup)
```
en_route_vendor → arrived_vendor → returned
```

---

## 💰 Payments

### Edge Functions

#### `paystack-payment`
Initialize and verify Paystack payments.

```typescript
// Initialize payment
await supabase.functions.invoke('paystack-payment', {
  body: {
    action: 'initialize',
    email: 'user@example.com',
    amount: 5000, // in XOF
    callback_url: 'https://app.com/payment/callback',
    metadata: { order_id: '...' }
  }
});

// Verify payment
await supabase.functions.invoke('paystack-payment', {
  body: {
    action: 'verify',
    reference: 'PAY-XXXXX'
  }
});
```

#### `purchase-tokens`
Buy platform tokens (for vendors/drivers).

```typescript
await supabase.functions.invoke('purchase-tokens', {
  body: {
    amount: 10000, // tokens to buy
    email: 'vendor@example.com',
    callback_url: 'https://app.com/payment/callback'
  }
});
```

#### `process-refund`
Handle order/booking refunds.

```typescript
await supabase.functions.invoke('process-refund', {
  body: {
    action: 'initiate', // or 'verify', 'webhook'
    cancellation_id: 'xxx',
    amount: 5000
  }
});
```

---

## 🪙 Token System

Vendors and drivers use tokens to pay platform commissions.

### `user_tokens`
Token balance per user.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | FK to profiles |
| `balance` | integer | Current token balance |

### `token_transactions`
Token movement history.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | FK to profiles |
| `amount` | integer | +/- tokens |
| `type` | text | `purchase`, `commission_deduction` |
| `reference_type` | text | `order`, `service_booking`, `delivery_request` |
| `balance_after` | integer | Balance after transaction |

### RPC Functions
```sql
-- Add tokens after purchase
SELECT add_tokens(user_id, amount, payment_reference);

-- Deduct commission (automatic on completion)
SELECT deduct_tokens(user_id, amount, reference_type, reference_id, description);
```

---

## 📍 Delivery Zones

### `delivery_zones`
Geographic service areas.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Zone name |
| `center_lat/lng` | float | Zone center |
| `radius_km` | numeric | Coverage radius |
| `city` | text | City name |

### `driver_zones`
Maps drivers to their active zones.

---

## 🔐 Authentication

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      nom_complet: 'John Doe',
      contact: '+22370000000'
    }
  }
});

// Assign role after signup
await supabase.rpc('assign_self_role', { role_name: 'client' });
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

---

## 📱 Mobile-Specific Endpoints

### Driver Location Updates
```typescript
await supabase
  .from('profiles')
  .update({
    current_lat: latitude,
    current_lng: longitude,
    last_location_update: new Date().toISOString()
  })
  .eq('id', userId);
```

### Toggle Driver Availability
```typescript
await supabase
  .from('profiles')
  .update({ is_available: true })
  .eq('id', userId);
```

### Real-time Subscriptions
```typescript
// Listen for new delivery assignments
supabase
  .channel('driver-deliveries')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'delivery_requests',
    filter: `driver_id=eq.${userId}`
  }, (payload) => {
    console.log('Delivery update:', payload);
  })
  .subscribe();
```

---

## 🏷️ Important Enums

### `app_role`
```
super_admin | admin | equipe | vendeur | livreur | membre | client
```

### `payment_type`
```
order | service_booking | tokens | subscription
```

### `message_type`
```
text | image | video | audio | location
```

### `message_status`
```
sent | delivered | read
```

---

## 📋 Common Queries

### Get user's orders
```typescript
const { data } = await supabase
  .from('orders')
  .select(`
    *,
    order_items(*, product:products(*)),
    delivery_address:delivery_addresses(*)
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Get available services
```typescript
const { data } = await supabase
  .from('services')
  .select(`
    *,
    shops(name, logo_url, is_official)
  `)
  .eq('is_active', true)
  .eq('requires_booking', true);
```

### Get driver's pending deliveries
```typescript
const { data } = await supabase
  .from('delivery_requests')
  .select(`
    *,
    order:orders(order_number, delivery_addresses(*)),
    driver:profiles!driver_id(nom_complet)
  `)
  .eq('driver_id', driverId)
  .in('status', ['assigned', 'in_progress', 'picked_up', 'en_route_client', 'arrived']);
```

---

## 🔒 Security Notes

1. **RLS Enabled**: All tables have Row Level Security policies
2. **Auth Required**: Most operations require authenticated user
3. **Role-Based Access**: Some operations restricted by user role
4. **Token Validation**: Edge functions validate Paystack responses

---

## 📞 Support

- Platform settings: `platform_settings` table (single row)
- Support email: `support_email` column
- Support phone: `support_phone` column
