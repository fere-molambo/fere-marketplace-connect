-- 1. Permettre aux livreurs de mettre à jour les commandes qu'ils livrent
CREATE POLICY "Drivers can update orders they deliver"
  ON orders FOR UPDATE
  USING (
    has_role(auth.uid(), 'livreur') AND
    EXISTS (
      SELECT 1 FROM delivery_requests
      WHERE delivery_requests.order_id = orders.id
      AND delivery_requests.driver_id = auth.uid()
    )
  );

-- 2. Permettre aux livreurs de créer des remboursements pour les commandes qu'ils livrent
CREATE POLICY "Drivers can create refunds for deliveries"
  ON refunds FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'livreur') AND
    EXISTS (
      SELECT 1 FROM delivery_requests
      WHERE delivery_requests.order_id = refunds.order_id
      AND delivery_requests.driver_id = auth.uid()
    )
  );

-- 3. Permettre aux livreurs de créer des pénalités pour les commandes qu'ils livrent
CREATE POLICY "Drivers can create penalties for deliveries"
  ON client_penalties FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'livreur') AND
    EXISTS (
      SELECT 1 FROM delivery_requests
      WHERE delivery_requests.order_id = client_penalties.source_order_id
      AND delivery_requests.driver_id = auth.uid()
    )
  );