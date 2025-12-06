-- Create function to mark messages as read (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(message_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages
  SET status = 'read', read_at = NOW()
  WHERE id = ANY(message_ids)
    AND sender_id != auth.uid()  -- Only recipient can mark as read
    AND is_conversation_participant(auth.uid(), conversation_id)
    AND status != 'read';  -- Don't update already read messages
END;
$$;