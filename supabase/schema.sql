-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  files_processed integer default 0 not null,
  is_pro boolean default false not null,
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies
-- Users can read their own profile
create policy "Users can view own profile" 
on public.profiles for select 
using ( auth.uid() = id );

-- Optional: users can update their own profile (if you want frontend to mutate metadata, else omit or limit)
create policy "Users can update own profile" 
on public.profiles for update 
using ( auth.uid() = id );

-- Create trigger to automatically insert a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, files_processed, is_pro)
  values (new.id, 0, false);
  return new;
end;
$$;

-- Bind the trigger to the auth.users table
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
