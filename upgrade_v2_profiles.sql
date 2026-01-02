-- PROFESSIONAL UPGRADE V2: PERFILES Y ROLES

-- 1. Tabla de Perfiles Públicos (Para no exponer auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  role text check (role in ('sender', 'recipient', 'admin')) default 'sender',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Seguridad (RLS) para Perfiles
alter table public.profiles enable row level security;

-- Cualquiera puede ver perfiles (necesario para compartir emails entre ex-parejas)
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

-- Solo el usuario puede editar su propio perfil
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- 3. Trigger Automático: Cada vez que alguien se registra, se crea su perfil
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'sender');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Upgrade de Tabla Depósitos (Relaciones más fuertes)
-- Añadimos Foreign Key real para el destinatario si existe en profiles
alter table public.deposits 
add column recipient_id uuid references public.profiles(id);
