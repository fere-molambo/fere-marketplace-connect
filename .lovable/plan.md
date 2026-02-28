

# Fix: Edge function `send-notification` auth bug

## Problem
The function uses `supabase.auth.getClaims(token)` which does NOT exist in supabase-js v2. This causes a 401 error on every call.

## Fix
Replace `getClaims` with `supabase.auth.getUser()` which is the correct v2 method to validate the JWT and get the authenticated user.

### File: `supabase/functions/send-notification/index.ts`
- Lines 30-38: Replace `getClaims` block with `getUser()` call
- `getUser()` automatically uses the Authorization header passed to the client

## Verification
- Tables `device_tokens` and `live_tracking_sessions`: OK
- RLS policies: OK (6 policies across both tables)
- Realtime publication for `live_tracking_sessions`: OK
- `config.toml` entry: OK

