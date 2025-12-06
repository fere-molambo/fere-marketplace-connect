-- Ajouter la colonne created_by à conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Mettre à jour la politique SELECT pour inclure le créateur
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_conversation_participant(auth.uid(), id)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Permettre au créateur de mettre à jour la conversation
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.is_conversation_participant(auth.uid(), id)
);