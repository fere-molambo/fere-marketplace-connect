-- Create team assignment tags table
CREATE TABLE public.team_assignment_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.team_assignment_tags ENABLE ROW LEVEL SECURITY;

-- Drop the CHECK constraint on shop_team_members
ALTER TABLE public.shop_team_members 
DROP CONSTRAINT IF EXISTS shop_team_members_assignment_type_check;

-- Insert default tags
INSERT INTO public.team_assignment_tags (name, label, color, display_order) VALUES
  ('support-faq', 'Support / FAQ', '#3b82f6', 1),
  ('community-management', 'Community Management', '#8b5cf6', 2),
  ('marketing-vente', 'Marketing & Vente', '#10b981', 3),
  ('fidelisation', 'Fidélisation', '#f59e0b', 4),
  ('administration', 'Administration', '#ef4444', 5),
  ('autre', 'Autre', '#6b7280', 6);

-- RLS Policies for team_assignment_tags
CREATE POLICY "Authenticated users can view active tags"
ON public.team_assignment_tags
FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage tags"
ON public.team_assignment_tags
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));