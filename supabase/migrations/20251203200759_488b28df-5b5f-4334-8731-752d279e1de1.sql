-- Table des avis de boutique
CREATE TABLE public.shop_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, user_id)
);

-- Validation du rating via trigger (pas de CHECK avec des valeurs dynamiques)
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_review_rating_trigger
BEFORE INSERT OR UPDATE ON public.shop_reviews
FOR EACH ROW
EXECUTE FUNCTION public.validate_review_rating();

-- Table des réponses aux avis
CREATE TABLE public.review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.shop_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reply TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

-- Fonction helper pour vérifier si l'utilisateur peut gérer les avis d'une boutique
CREATE OR REPLACE FUNCTION public.can_manage_shop_reviews(_shop_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops
    WHERE id = _shop_id
    AND (
      owner_id = _user_id
      OR is_shop_team_member(_user_id, id)
      OR has_role(_user_id, 'super_admin'::app_role)
      OR has_role(_user_id, 'admin'::app_role)
    )
  )
$$;

-- Politiques RLS pour shop_reviews

-- Tout le monde peut voir les avis
CREATE POLICY "Anyone can view reviews"
ON public.shop_reviews
FOR SELECT
USING (true);

-- Les utilisateurs authentifiés peuvent créer leurs propres avis
CREATE POLICY "Authenticated users can create their own reviews"
ON public.shop_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent modifier leurs propres avis
CREATE POLICY "Users can update their own reviews"
ON public.shop_reviews
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres avis OU les gestionnaires de boutique
CREATE POLICY "Users or shop managers can delete reviews"
ON public.shop_reviews
FOR DELETE
USING (
  auth.uid() = user_id
  OR can_manage_shop_reviews(shop_id, auth.uid())
);

-- Politiques RLS pour review_replies

-- Tout le monde peut voir les réponses
CREATE POLICY "Anyone can view replies"
ON public.review_replies
FOR SELECT
USING (true);

-- Seuls les gestionnaires de boutique peuvent créer des réponses
CREATE POLICY "Shop managers can create replies"
ON public.review_replies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shop_reviews r
    WHERE r.id = review_id
    AND can_manage_shop_reviews(r.shop_id, auth.uid())
  )
);

-- Les utilisateurs peuvent modifier leurs propres réponses
CREATE POLICY "Users can update their own replies"
ON public.review_replies
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres réponses OU les gestionnaires
CREATE POLICY "Users or shop managers can delete replies"
ON public.review_replies
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.shop_reviews r
    WHERE r.id = review_id
    AND can_manage_shop_reviews(r.shop_id, auth.uid())
  )
);

-- Trigger pour updated_at sur shop_reviews
CREATE TRIGGER update_shop_reviews_updated_at
BEFORE UPDATE ON public.shop_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();