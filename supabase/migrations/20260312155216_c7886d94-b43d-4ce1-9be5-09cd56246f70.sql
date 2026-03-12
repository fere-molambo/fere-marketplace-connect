
-- Insert missing refund for the cancelled order
INSERT INTO public.refunds (
  order_id, user_id, amount, net_refund,
  transaction_fee_deducted, original_payment_reference,
  status, refund_status, cancellation_id
) VALUES (
  '4a9a6fa0-94b0-4c17-a679-58c1fe5ef350',
  '8d859072-3e84-48eb-a798-02c86cec3c67',
  909, 909, 0,
  'FERE_1773328557074_3jvfw',
  'pending', 'pending',
  'c8d6fd14-8eb6-4cbc-972f-d84911f736fe'
);
