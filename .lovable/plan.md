
# Fix: Delivery Requests Invisible to Drivers

## Root Cause

In `src/pages/Checkout.tsx` (line 273), when creating a delivery request, the `zone_id` is hardcoded to `null`:

```typescript
zone_id: null, // BUG: should use shop's delivery_zone_id
```

The RLS policy on `delivery_requests` for drivers checks:

```text
status = 'pending' AND zone_id IN (SELECT zone_id FROM driver_zones WHERE ...)
```

Since `NULL IN (any_list)` is always `NULL` (falsy in SQL), drivers can **never** see these pending delivery requests, regardless of their zone selection.

## Fix

### 1. Set `zone_id` from shop data in `Checkout.tsx`

The shop's `delivery_zone_id` is already available in the cart item data (`item.product.shops.delivery_zone_id`). We just need to use it:

```typescript
// Line ~273 in Checkout.tsx
zone_id: firstItem.product.shops.delivery_zone_id || null,
```

### 2. Update RLS policy to also handle NULL zone_id (safety net)

Add `zone_id IS NULL` as a fallback in the driver SELECT policy, so even if a shop has no zone assigned, drivers can still see the request:

```sql
DROP POLICY "Drivers can view requests in their zones" ON delivery_requests;
CREATE POLICY "Drivers can view requests in their zones"
ON delivery_requests FOR SELECT
USING (
  (
    (status = 'pending') AND (
      zone_id IN (
        SELECT zone_id FROM driver_zones
        WHERE driver_id = auth.uid() AND is_active = true
      )
      OR zone_id IS NULL
    )
  )
  OR (driver_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);
```

Similarly update the driver UPDATE policy:

```sql
DROP POLICY "Drivers can accept and update requests" ON delivery_requests;
CREATE POLICY "Drivers can accept and update requests"
ON delivery_requests FOR UPDATE
USING (
  (
    (status = 'pending') AND (
      zone_id IN (
        SELECT zone_id FROM driver_zones
        WHERE driver_id = auth.uid() AND is_active = true
      )
      OR zone_id IS NULL
    )
  )
  OR (driver_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);
```

### 3. Fix existing orphaned delivery requests

Run a one-time data fix to populate `zone_id` on existing delivery requests that have `NULL` zone_id:

```sql
UPDATE delivery_requests dr
SET zone_id = o_shop.delivery_zone_id
FROM orders o
JOIN shops o_shop ON o_shop.id = o.shop_id
WHERE dr.order_id = o.id
  AND dr.zone_id IS NULL
  AND o_shop.delivery_zone_id IS NOT NULL;
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Checkout.tsx` | Line 273: use `delivery_zone_id` from shop |
| DB Migration | Update 2 RLS policies + fix existing data |

## Technical Details

- The `delivery_zone_id` is already stored in the cart context (`CartProduct.shops.delivery_zone_id`)
- The `DriverDeliveriesSection.tsx` query already handles null zones with `.or(zone_id.in.(...),zone_id.is.null)` -- but the RLS blocks it at the database level
- Both the SELECT and UPDATE policies for drivers need the same fix
