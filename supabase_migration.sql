-- VaneStyle Database Schema
-- Run this in Supabase Dashboard > SQL Editor

-- Profiles: extends Supabase auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  age int,
  profession text,
  style_goal text,
  onboarding_completed boolean default false,
  is_premium boolean default false,
  created_at timestamptz default now()
);

-- Face diagnoses
create table public.face_diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  face_type text not null,
  features jsonb default '{}',
  recommendations jsonb default '[]',
  created_at timestamptz default now()
);

-- Color diagnoses
create table public.color_diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  season text not null,
  sub_season text,
  palette jsonb default '[]',
  avoid_colors jsonb default '[]',
  symbology text,
  created_at timestamptz default now()
);

-- Closet items
create table public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  name text,
  category text not null,
  subcategory text,
  color text,
  image_url text,
  worn_count int default 0,
  created_at timestamptz default now()
);

-- Outfits
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  items uuid[] default '{}',
  purpose text,
  occasion text,
  is_saved boolean default false,
  created_at timestamptz default now()
);

-- Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  service_type text not null,
  date timestamptz,
  status text default 'pending',
  payment_id text,
  calendly_event_id text,
  created_at timestamptz default now()
);

-- Chat sessions
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  messages jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.face_diagnoses enable row level security;
alter table public.color_diagnoses enable row level security;
alter table public.closet_items enable row level security;
alter table public.outfits enable row level security;
alter table public.bookings enable row level security;
alter table public.chat_sessions enable row level security;

-- RLS Policies: users can only access their own data

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Face diagnoses
create policy "Users can view own face diagnoses" on public.face_diagnoses for select using (auth.uid() = user_id);
create policy "Users can insert own face diagnoses" on public.face_diagnoses for insert with check (auth.uid() = user_id);
create policy "Users can update own face diagnoses" on public.face_diagnoses for update using (auth.uid() = user_id);

-- Color diagnoses
create policy "Users can view own color diagnoses" on public.color_diagnoses for select using (auth.uid() = user_id);
create policy "Users can insert own color diagnoses" on public.color_diagnoses for insert with check (auth.uid() = user_id);
create policy "Users can update own color diagnoses" on public.color_diagnoses for update using (auth.uid() = user_id);

-- Closet items
create policy "Users can view own closet items" on public.closet_items for select using (auth.uid() = user_id);
create policy "Users can insert own closet items" on public.closet_items for insert with check (auth.uid() = user_id);
create policy "Users can update own closet items" on public.closet_items for update using (auth.uid() = user_id);
create policy "Users can delete own closet items" on public.closet_items for delete using (auth.uid() = user_id);

-- Outfits
create policy "Users can view own outfits" on public.outfits for select using (auth.uid() = user_id);
create policy "Users can insert own outfits" on public.outfits for insert with check (auth.uid() = user_id);
create policy "Users can update own outfits" on public.outfits for update using (auth.uid() = user_id);
create policy "Users can delete own outfits" on public.outfits for delete using (auth.uid() = user_id);

-- Bookings
create policy "Users can view own bookings" on public.bookings for select using (auth.uid() = user_id);
create policy "Users can insert own bookings" on public.bookings for insert with check (auth.uid() = user_id);
create policy "Users can update own bookings" on public.bookings for update using (auth.uid() = user_id);

-- Chat sessions
create policy "Users can view own chat sessions" on public.chat_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own chat sessions" on public.chat_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own chat sessions" on public.chat_sessions for update using (auth.uid() = user_id);

-- Auto-create profile on signup via trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create storage bucket for closet items
insert into storage.buckets (id, name, public)
values ('closet-items', 'closet-items', false);

-- Storage RLS: users can manage their own folder
create policy "Users can upload own closet images"
  on storage.objects for insert
  with check (bucket_id = 'closet-items' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own closet images"
  on storage.objects for select
  using (bucket_id = 'closet-items' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own closet images"
  on storage.objects for delete
  using (bucket_id = 'closet-items' and (storage.foldername(name))[1] = auth.uid()::text);
