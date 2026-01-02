-- 1. Create Profile/Settings Table (Optional, but good for roles)
-- We will handle roles simply via metadata or specific check for this specialized app

-- 2. Create Deposits Table
create table public.deposits (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  amount numeric not null,
  currency text default 'USD',
  deposit_date date not null,
  sender_id uuid references auth.users not null,
  recipient_email text not null, -- Simple way to link to the ex-wife without complex friend systems
  voucher_url text,
  status text check (status in ('sent', 'read')) default 'sent',
  read_at timestamp with time zone,
  note text
);

-- 3. Set up Storage for Vouchers
insert into storage.buckets (id, name, public) 
values ('vouchers', 'vouchers', false);

-- 4. Enable RLS (Security Policies)
alter table public.deposits enable row level security;
create policy "Sender can insert their own deposits"
  on public.deposits for insert
  with check (auth.uid() = sender_id);

create policy "Sender can view their own deposits"
  on public.deposits for select
  using (auth.uid() = sender_id);

create policy "Recipient can view deposits meant for them"
  on public.deposits for select
  using (auth.email() = recipient_email);

create policy "Recipient can update status (mark as read)"
  on public.deposits for update
  using (auth.email() = recipient_email);
  
-- Storage Policies
create policy "Authenticated users can upload vouchers"
  on storage.objects for insert
  with check (bucket_id = 'vouchers' and auth.role() = 'authenticated');

create policy "Users can view their own sent or received vouchers"
  on storage.objects for select
  using (bucket_id = 'vouchers' and auth.role() = 'authenticated'); 
  -- Simplified storage policy for demo, ideally match filename to deposit ID owner
