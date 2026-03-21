
CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  replied_by uuid REFERENCES auth.users(id),
  replied_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact" ON public.contact_requests
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can manage contacts" ON public.contact_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
