-- Fix search_path for validate_story_duration function
CREATE OR REPLACE FUNCTION validate_story_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at > NEW.created_at + INTERVAL '7 days' THEN
    RAISE EXCEPTION 'Story duration cannot exceed 7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;