
-- Bucket pour les médias de chat (privé pour sécurité)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', false);

-- Enum pour le statut des messages
CREATE TYPE message_status AS ENUM ('failed', 'pending', 'sent', 'read');

-- Enum pour le type de message
CREATE TYPE message_type AS ENUM ('text', 'image', 'audio');

-- Table des conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Participants aux conversations
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_muted BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Messages avec états détaillés
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT,
  media_url TEXT,
  media_type message_type NOT NULL DEFAULT 'text',
  status message_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0
);

-- Utilisateurs bloqués
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  blocked_by_admin BOOLEAN DEFAULT false,
  reason TEXT,
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour conversations
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = id AND user_id = auth.uid()
  )
);

-- RLS Policies pour participants
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Authenticated users can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their participant status"
ON public.conversation_participants FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies pour messages
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
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

CREATE POLICY "Senders can update their messages"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid());

CREATE POLICY "Senders can delete their messages"
ON public.messages FOR DELETE
USING (sender_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies pour blocked_users
CREATE POLICY "Users can view their blocks"
ON public.blocked_users FOR SELECT
USING (
  blocker_id = auth.uid()
  OR blocked_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can block others"
ON public.blocked_users FOR INSERT
WITH CHECK (
  blocker_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can unblock"
ON public.blocked_users FOR DELETE
USING (
  blocker_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Storage policies for chat-media bucket
CREATE POLICY "Users can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view chat media in their conversations"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their chat media"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX idx_blocked_users_blocker_id ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);
