
INSERT INTO pending_payouts (recipient_id, recipient_type, amount, booking_id, eligible_at)
VALUES 
  ('4671cff3-cfc0-42a8-a305-d49dbd70c388', 'vendor', 218, 'd8fbf070-b306-4e38-98d5-2673a25ec67b', now() + interval '24 hours'),
  ('9bc2e77f-14ff-451f-b9d0-287c8e18ae42', 'vendor', 12, 'adac88d4-31b7-4b22-aa7e-60740920d036', now() + interval '24 hours');
