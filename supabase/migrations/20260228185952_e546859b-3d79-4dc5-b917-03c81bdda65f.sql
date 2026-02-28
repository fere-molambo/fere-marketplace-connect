
-- Table des préférences de notifications par utilisateur
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Membre (client)
  order_status_updates boolean NOT NULL DEFAULT true,
  delivery_tracking boolean NOT NULL DEFAULT true,
  promotions boolean NOT NULL DEFAULT true,
  messages boolean NOT NULL DEFAULT true,
  booking_reminders boolean NOT NULL DEFAULT true,
  -- Vendeur / Équipe
  new_orders boolean NOT NULL DEFAULT true,
  order_cancellations boolean NOT NULL DEFAULT true,
  new_reviews boolean NOT NULL DEFAULT true,
  low_stock boolean NOT NULL DEFAULT true,
  new_bookings boolean NOT NULL DEFAULT true,
  -- Livreur
  new_delivery_available boolean NOT NULL DEFAULT true,
  delivery_status_changes boolean NOT NULL DEFAULT true,
  payout_updates boolean NOT NULL DEFAULT true,
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create preferences on new user signup via handle_new_user or on first access
-- We'll let the mobile app upsert on first login
