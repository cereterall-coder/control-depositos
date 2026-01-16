-- Add subscription columns to PROFILES table (if they don't exist)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial', -- 'trial', 'active', 'expired', 'suspended'
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 days'),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Update existing users to have a trial period starting NOW if they are null
UPDATE public.profiles 
SET 
  subscription_status = 'trial',
  trial_start_date = created_at,
  trial_end_date = (created_at + INTERVAL '15 days')
WHERE subscription_status IS NULL;

-- Automatically mark users older than 15 days as expired if they claim to be trial
UPDATE public.profiles
SET subscription_status = 'expired'
WHERE subscription_status = 'trial' 
AND trial_end_date < NOW();
