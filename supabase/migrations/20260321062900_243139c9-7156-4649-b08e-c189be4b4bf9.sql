DROP POLICY IF EXISTS "Anyone can record a story view" ON public.story_views;
CREATE POLICY "Users can record their own story views"
ON public.story_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid());