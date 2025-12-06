-- Fonction SECURITY DEFINER pour vérifier si un utilisateur participe à une conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  );
$$;

-- Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

-- Recréer les politiques avec la fonction SECURITY DEFINER
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  public.is_conversation_participant(auth.uid(), id)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (public.is_conversation_participant(auth.uid(), id));

CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_conversation_participant(auth.uid(), conversation_id)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  public.is_conversation_participant(auth.uid(), conversation_id)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_participant(auth.uid(), conversation_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = auth.uid() OR blocked_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND (cp.user_id = blocked_users.blocker_id OR cp.user_id = blocked_users.blocked_id)
    )
  )
);