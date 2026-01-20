-- Drop existing policies if they exist to avoid conflicts
drop policy if exists "Users can view their own settings" on public.user_settings;
drop policy if exists "Users can update their own settings" on public.user_settings;
drop policy if exists "Users can insert their own settings" on public.user_settings;

-- Create user_settings table if it doesn't exist
create table if not exists public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  email_welcome boolean default true,
  email_new_message boolean default true,
  email_low_credits boolean default true,
  email_marketing boolean default false,
  email_weekly_report boolean default false,
  low_credits_threshold integer default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Enable RLS
alter table public.user_settings enable row level security;

-- Create policies
create policy "Users can view their own settings"
  on public.user_settings for select
  using ( auth.uid() = user_id );

create policy "Users can update their own settings"
  on public.user_settings for update
  using ( auth.uid() = user_id );

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check ( auth.uid() = user_id );

-- Grant access to authenticated users
grant all on public.user_settings to authenticated;
