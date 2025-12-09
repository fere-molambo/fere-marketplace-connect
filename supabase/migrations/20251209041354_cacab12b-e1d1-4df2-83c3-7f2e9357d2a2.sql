-- Add TVA rate to platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS tva_rate numeric DEFAULT 18;

-- Create category_commissions table for product and service commissions
CREATE TABLE IF NOT EXISTS public.category_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE,
  service_type_id uuid REFERENCES public.service_provider_types(id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT category_or_service_type CHECK (
    (category_id IS NOT NULL AND service_type_id IS NULL) OR 
    (category_id IS NULL AND service_type_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.category_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view commissions"
ON public.category_commissions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage commissions"
ON public.category_commissions FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_category_commissions_updated_at
BEFORE UPDATE ON public.category_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add recipient fields to delivery_addresses
ALTER TABLE public.delivery_addresses
ADD COLUMN IF NOT EXISTS recipient_name text,
ADD COLUMN IF NOT EXISTS recipient_phone text;