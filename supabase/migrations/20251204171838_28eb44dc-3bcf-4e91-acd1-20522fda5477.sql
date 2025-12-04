-- Add logo_footer column to platform_settings
ALTER TABLE public.platform_settings
ADD COLUMN logo_footer text;