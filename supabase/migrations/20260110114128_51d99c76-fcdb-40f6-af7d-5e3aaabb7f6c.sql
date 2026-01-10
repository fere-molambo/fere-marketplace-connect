-- Table pour les pénalités client (cash non payé à la livraison)
CREATE TABLE public.client_penalties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  source_order_id UUID REFERENCES orders(id),
  source_delivery_id UUID REFERENCES delivery_requests(id),
  applied_to_order_id UUID REFERENCES orders(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'waived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  applied_at TIMESTAMP WITH TIME ZONE,
  waived_at TIMESTAMP WITH TIME ZONE,
  waived_by UUID REFERENCES profiles(id),
  waived_reason TEXT
);

-- Enable RLS
ALTER TABLE public.client_penalties ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage penalties"
ON public.client_penalties
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own penalties"
ON public.client_penalties
FOR SELECT
USING (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_client_penalties_user_pending ON public.client_penalties(user_id) WHERE status = 'pending';
CREATE INDEX idx_client_penalties_status ON public.client_penalties(status);

-- Add column to track refund initiation in Payments.tsx
COMMENT ON TABLE public.client_penalties IS 'Tracks penalties for clients who refused cash payment at delivery';