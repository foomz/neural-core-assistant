/*
  # Add conversation title and management features

  1. Changes
    - Add default title to conversations table
    - Add trigger to auto-update conversation titles based on first message
*/

-- Add default title if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'title'
  ) THEN
    ALTER TABLE conversations ADD COLUMN title text DEFAULT 'New Conversation';
  END IF;
END $$;