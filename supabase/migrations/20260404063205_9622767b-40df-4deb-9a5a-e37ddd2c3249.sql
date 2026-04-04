
CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_info text,
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_note text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own deletion request"
  ON public.account_deletion_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests"
  ON public.account_deletion_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests"
  ON public.account_deletion_requests FOR ALL
  TO authenticated USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Public can create deletion request"
  ON public.account_deletion_requests FOR INSERT
  TO anon WITH CHECK (true);
