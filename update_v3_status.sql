-- Add status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Valid statuses could be: 'active', 'pending', 'blocked'

-- Ensure all existing users are set to active
UPDATE public.profiles 
SET status = 'active' 
WHERE status IS NULL;

-- Verify
-- SELECT * FROM public.profiles;
