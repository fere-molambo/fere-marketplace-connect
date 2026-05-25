INSERT INTO public.profiles (id, nom_complet, contact, created_at, updated_at)
VALUES ('69b22fdf-db44-4c7b-8a1e-720f9a2124d5', 'Junior MOLAMBO', '+22376771321', now(), now())
ON CONFLICT (id) DO NOTHING;