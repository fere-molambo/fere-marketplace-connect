-- Purge all token data as requested

-- 1. Delete all token transactions history
DELETE FROM token_transactions;

-- 2. Delete all user token balances (reset to zero)
DELETE FROM user_tokens;

-- 3. Delete all token payment transactions
DELETE FROM payment_transactions WHERE reference LIKE 'TOK-%';