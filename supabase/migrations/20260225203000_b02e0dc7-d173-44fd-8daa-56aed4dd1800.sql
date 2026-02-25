
-- Drop columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS sexe;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS tranche_age;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS statut_matrimonial;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS statut_professionnel;

-- Drop associated enum types
DROP TYPE IF EXISTS public.client_sexe;
DROP TYPE IF EXISTS public.client_tranche_age;
DROP TYPE IF EXISTS public.client_statut_matrimonial;
DROP TYPE IF EXISTS public.client_statut_professionnel;

-- Drop max_cash_order_amount from platform_settings
ALTER TABLE public.platform_settings DROP COLUMN IF EXISTS max_cash_order_amount;
