-- Create cancellation-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('cancellation-attachments', 'cancellation-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for cancellation-attachments bucket
CREATE POLICY "Authenticated users can upload cancellation attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cancellation-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view cancellation attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'cancellation-attachments');

CREATE POLICY "Users can update their own cancellation attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cancellation-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own cancellation attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'cancellation-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
