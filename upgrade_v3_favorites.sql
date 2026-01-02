-- FEATURE: FAVORITES / CONTACTS

create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  contact_email text not null,
  contact_name text, -- Optional alias
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, contact_email) -- Prevent duplicate favorites for same user
);

alter table public.contacts enable row level security;

create policy "Users manage their own contacts"
  on public.contacts for all
  using (auth.uid() = user_id);
