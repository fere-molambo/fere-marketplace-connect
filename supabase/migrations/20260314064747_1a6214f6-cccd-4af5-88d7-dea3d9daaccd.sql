CREATE TABLE IF NOT EXISTS pending_pin_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  otp_token text NOT NULL,
  otp_expires_at timestamptz NOT NULL,
  otp_attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pending_pin_resets ENABLE ROW LEVEL SECURITY;