-- 1. Clean all order/booking/delivery/payment data
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE delivery_requests CASCADE;
TRUNCATE TABLE payment_transactions CASCADE;
TRUNCATE TABLE service_bookings CASCADE;
TRUNCATE TABLE orders CASCADE;

-- 2. Remove advance_percent and remaining_amount columns from orders
ALTER TABLE orders DROP COLUMN IF EXISTS advance_percent;
ALTER TABLE orders DROP COLUMN IF EXISTS remaining_amount;

-- 3. Remove advance_paid column from service_bookings (we'll keep total_price only)
-- Actually we'll keep advance_paid but remove any partial payment concept

-- 4. Add service confirmation fields to service_bookings
ALTER TABLE service_bookings 
ADD COLUMN IF NOT EXISTS vendor_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
ADD COLUMN IF NOT EXISTS client_review TEXT;

-- 5. Create user_tokens table for driver/vendor token balance
CREATE TABLE IF NOT EXISTS public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_tokens
CREATE POLICY "Users can view their own tokens" ON public.user_tokens
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all tokens" ON public.user_tokens
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own tokens via system" ON public.user_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Create token_transactions table for purchase/deduction history
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = purchase, negative = deduction
  type TEXT NOT NULL CHECK (type IN ('purchase', 'commission_deduction')),
  reference_type TEXT CHECK (reference_type IN ('order', 'service_booking', 'delivery_request')),
  reference_id UUID,
  description TEXT,
  balance_after INTEGER NOT NULL,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for token_transactions
CREATE POLICY "Users can view their own token transactions" ON public.token_transactions
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert token transactions" ON public.token_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all token transactions" ON public.token_transactions
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 7. Create function to initialize user tokens when needed
CREATE OR REPLACE FUNCTION public.ensure_user_tokens(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance FROM user_tokens WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO user_tokens (user_id, balance) VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING balance INTO v_balance;
    v_balance := COALESCE(v_balance, 0);
  END IF;
  RETURN v_balance;
END;
$$;

-- 8. Create function to add tokens (after purchase)
CREATE OR REPLACE FUNCTION public.add_tokens(p_user_id UUID, p_amount INTEGER, p_payment_reference TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Ensure user_tokens record exists
  PERFORM ensure_user_tokens(p_user_id);
  
  -- Update balance
  UPDATE user_tokens 
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO token_transactions (user_id, amount, type, description, balance_after, payment_reference)
  VALUES (p_user_id, p_amount, 'purchase', 'Achat de ' || p_amount || ' tokens', v_new_balance, p_payment_reference);
  
  RETURN v_new_balance;
END;
$$;

-- 9. Create function to deduct tokens (for commission)
CREATE OR REPLACE FUNCTION public.deduct_tokens(
  p_user_id UUID, 
  p_amount INTEGER, 
  p_reference_type TEXT, 
  p_reference_id UUID,
  p_description TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance FROM user_tokens WHERE user_id = p_user_id;
  
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Solde de tokens insuffisant. Requis: %, Disponible: %', p_amount, COALESCE(v_current_balance, 0);
  END IF;
  
  -- Update balance
  UPDATE user_tokens 
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO token_transactions (user_id, amount, type, reference_type, reference_id, description, balance_after)
  VALUES (p_user_id, -p_amount, 'commission_deduction', p_reference_type, p_reference_id, p_description, v_new_balance);
  
  RETURN v_new_balance;
END;
$$;

-- 10. Add updated_at trigger for user_tokens
CREATE TRIGGER update_user_tokens_updated_at
  BEFORE UPDATE ON user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();