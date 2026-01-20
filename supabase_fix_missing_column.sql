-- Add the missing column for weekly reports
alter table public.user_settings 
add column if not exists email_weekly_report boolean default false;

-- Add other potentially new columns just in case
alter table public.user_settings 
add column if not exists email_marketing boolean default false;
