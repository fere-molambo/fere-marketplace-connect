-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'abandoned');

-- Create payment type enum (extensible for future subscriptions, commissions, etc.)
CREATE TYPE payment_type AS ENUM ('order', 'service_booking', 'subscription', 'commission_payout');

-- Create payment_transactions table
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_type payment_type NOT NULL,
  related_id UUID,
  paystack_response JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_reference ON public.payment_transactions(reference);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_payment_type ON public.payment_transactions(payment_type);
CREATE INDEX idx_payment_transactions_related_id ON public.payment_transactions(related_id);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.payment_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own transactions
CREATE POLICY "Users can create their own transactions"
ON public.payment_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only system (via service role) can update transactions
CREATE POLICY "Admins can view all transactions"
ON public.payment_transactions
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can update transactions
CREATE POLICY "Admins can update transactions"
ON public.payment_transactions
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);