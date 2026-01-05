-- Add avatar_url column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Allow users to update their own avatar
create policy "Users can update own profile"
on public.profiles for update
using ( auth.uid() = id );
