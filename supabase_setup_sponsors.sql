-- Create a table for user profiles to store premium status and subscription ID
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  is_premium boolean default false,
  raw_subscription_id text
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a trigger to automatically create a profile for new users
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, is_premium)
  values (new.id, false);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Since we might already have users, let's insert profiles for existing users
insert into public.profiles (id, is_premium)
select id, false from auth.users
on conflict (id) do nothing;
