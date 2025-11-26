-- Add created_by to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

-- Create enum for story visibility
DO $$ BEGIN
  CREATE TYPE story_visibility AS ENUM ('public', 'clients_only', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns to shop_stories
ALTER TABLE shop_stories 
ADD COLUMN IF NOT EXISTS visibility story_visibility DEFAULT 'public',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

-- Add constraint for max 7 days duration (using trigger to avoid immutability issues)
CREATE OR REPLACE FUNCTION validate_story_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at > NEW.created_at + INTERVAL '7 days' THEN
    RAISE EXCEPTION 'Story duration cannot exceed 7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_story_duration ON shop_stories;
CREATE TRIGGER check_story_duration
  BEFORE INSERT OR UPDATE ON shop_stories
  FOR EACH ROW
  EXECUTE FUNCTION validate_story_duration();

-- Create function to cleanup expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM shop_stories WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;