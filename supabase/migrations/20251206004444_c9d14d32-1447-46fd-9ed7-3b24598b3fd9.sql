-- Create tutorials table for video and article tutorials
CREATE TABLE public.tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('video', 'article')),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  content TEXT,
  tag TEXT,
  slug TEXT UNIQUE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create faq_items table
CREATE TABLE public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tutorials
CREATE POLICY "Anyone can view published tutorials"
ON public.tutorials FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can view all tutorials"
ON public.tutorials FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage tutorials"
ON public.tutorials FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for faq_items
CREATE POLICY "Anyone can view published faq items"
ON public.faq_items FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can view all faq items"
ON public.faq_items FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage faq items"
ON public.faq_items FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for tutorial media
INSERT INTO storage.buckets (id, name, public) VALUES ('tutorial-media', 'tutorial-media', true);

-- Storage policies for tutorial-media bucket
CREATE POLICY "Anyone can view tutorial media"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorial-media');

CREATE POLICY "Admins can upload tutorial media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tutorial-media' AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can update tutorial media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tutorial-media' AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete tutorial media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tutorial-media' AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Trigger for updated_at
CREATE TRIGGER update_tutorials_updated_at
BEFORE UPDATE ON public.tutorials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();