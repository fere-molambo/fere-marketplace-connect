-- Cleanup blocked test data for +2250777992271
DELETE FROM pending_registrations WHERE phone = '+2250777992271';
DELETE FROM login_attempts WHERE phone = '+2250777992271';
DELETE FROM otp_rate_limits WHERE phone = '+2250777992271';
DELETE FROM pending_pin_resets WHERE phone = '+2250777992271';