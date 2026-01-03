-- ==========================================
-- ADMIN SYSTEM UPGRADE SCRIPT
-- ==========================================

-- 1. Ensure PROFILES table exists and has correct columns
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  role text default 'sender',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Ensure RLS is enabled
alter table public.profiles enable row level security;

-- 3. POLICIES (Permissions)

-- Allow everyone to read profiles (for contact search)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

-- Allow users to insert their *own* profile (for trigger/initial signup)
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Allow users to update their *own* profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- *** NEW: ALLOW ADMINS TO UPDATE ANY PROFILE ***
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using ( 
    auth.uid() in (select id from public.profiles where role = 'admin') 
  );

-- *** NEW: ALLOW ADMINS TO DELETE PROFILES ***
drop policy if exists "Admins can delete any profile" on public.profiles;
create policy "Admins can delete any profile"
  on public.profiles for delete
  using ( 
    auth.uid() in (select id from public.profiles where role = 'admin') 
  );


-- 4. TRIGGER: Sync Auth Users to Profiles automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
      new.id, 
      new.email, 
      new.raw_user_meta_data->>'full_name', 
      'sender' -- Default role is 'sender' or 'Miembro'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Re-create trigger to be safe
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==========================================
-- INSTRUCTIONS FOR CREATING ADMIN
-- ==========================================
/*
   PASO 1: Regístrate en la aplicación web con el correo:
           admin@control.com (o el que desees)
           y la clave: @malvivaAl3

   PASO 2: Una vez registrado, ejecuta la siguiente línea AQUÍ en el Editor SQL de Supabase:
   (Reemplaza 'admin@control.com' con tu correo real si usaste otro)
*/

-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@control.com';

