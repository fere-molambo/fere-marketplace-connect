-- Créer une fonction SECURITY DEFINER pour l'auto-attribution de rôle
CREATE OR REPLACE FUNCTION public.assign_self_role(role_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que le rôle est valide pour l'auto-inscription
  IF role_name NOT IN ('vendeur', 'livreur', 'membre') THEN
    RAISE EXCEPTION 'Role invalide pour l''auto-inscription';
  END IF;
  
  -- Vérifier que l'utilisateur n'a pas déjà ce rôle
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = role_name::app_role) THEN
    RETURN;
  END IF;
  
  -- Insérer le rôle
  INSERT INTO user_roles (user_id, role)
  VALUES (auth.uid(), role_name::app_role);
END;
$$;

-- Corriger le rôle de l'utilisateur existant vivi@fere.app
INSERT INTO user_roles (user_id, role) 
VALUES ('8d859072-3e84-48eb-a798-02c86cec3c67', 'membre')
ON CONFLICT (user_id, role) DO NOTHING;