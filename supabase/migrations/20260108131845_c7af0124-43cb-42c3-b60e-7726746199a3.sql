-- Permettre aux clients d'annuler leurs propres commandes
CREATE POLICY "Users can cancel their own orders"
  ON orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND status NOT IN ('delivered', 'cancelled')
  );

-- Permettre aux clients d'annuler les livraisons de leurs commandes
CREATE POLICY "Customers can cancel their delivery requests"
  ON delivery_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_requests.order_id
      AND orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_requests.order_id
      AND orders.user_id = auth.uid()
    )
    AND delivery_requests.status NOT IN ('delivered', 'cancelled')
  );

-- Corriger les données de test existantes
UPDATE orders 
SET status = 'cancelled', 
    cancellation_id = 'd8d059a0-f906-4b9a-832c-f17baf07519b',
    updated_at = now()
WHERE id = '817fede0-7251-4f4f-9ad3-e0f19be8aea1'
AND status != 'cancelled';

UPDATE delivery_requests 
SET status = 'cancelled',
    updated_at = now()
WHERE order_id = '817fede0-7251-4f4f-9ad3-e0f19be8aea1'
AND status != 'cancelled';

-- Supprimer l'annulation en doublon si elle existe
DELETE FROM cancellations 
WHERE id = 'afba3fa1-830a-4f34-bfc3-ed230c7b3c8e';