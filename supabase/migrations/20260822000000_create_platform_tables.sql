-- 1. Profiles Table (used by yardService)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid references auth.users not null primary key,
    username text not null unique,
    display_name text,
    is_admin boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
END $$;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- 2. user_created_games Table
CREATE TABLE IF NOT EXISTS public.user_created_games (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id),
    creator_username text not null,
    title text not null,
    description text,
    category text,
    thumbnail text,
    scene_data jsonb not null default '{}',
    status text not null default 'draft', -- draft, pending_review, approved, rejected, changes_requested, archived
    feedback text,
    plays integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_created_games enable row level security;
DO $$ BEGIN
    DROP POLICY IF EXISTS "Games are viewable by everyone" ON user_created_games;
    DROP POLICY IF EXISTS "Users can insert their own games" ON user_created_games;
    DROP POLICY IF EXISTS "Users can update their own games" ON user_created_games;
    DROP POLICY IF EXISTS "Admins can update any game" ON user_created_games;
END $$;
create policy "Games are viewable by everyone" on public.user_created_games for select using (true);
create policy "Users can insert their own games" on public.user_created_games for insert with check (auth.uid() = user_id);
create policy "Users can update their own games" on public.user_created_games for update using (auth.uid() = user_id);
create policy "Admins can update any game" on public.user_created_games for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 3. user_yards Table
CREATE TABLE IF NOT EXISTS public.user_yards (
    user_id uuid references auth.users not null primary key,
    yards integer default 0 not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_yards enable row level security;
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can read own yards" ON user_yards;
    DROP POLICY IF EXISTS "Users can update own yards" ON user_yards;
    DROP POLICY IF EXISTS "Admins can update yards" ON user_yards;
END $$;
create policy "Users can read own yards" on public.user_yards for select using (auth.uid() = user_id);
create policy "Users can update own yards" on public.user_yards for insert with check (auth.uid() = user_id);
create policy "Users can update own yards 2" on public.user_yards for update using (auth.uid() = user_id);
create policy "Admins can update yards" on public.user_yards for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Add yards to user_progress (yardService tries to sync both)
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS yards integer default 0;

-- 4. admin_yard_logs Table
CREATE TABLE IF NOT EXISTS public.admin_yard_logs (
    id text primary key,
    admin_email text not null,
    target_username text not null,
    amount integer not null,
    reason text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admin_yard_logs enable row level security;
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can view logs" ON admin_yard_logs;
    DROP POLICY IF EXISTS "Admins can insert logs" ON admin_yard_logs;
    DROP POLICY IF EXISTS "Anyone can insert logs for promo codes" ON admin_yard_logs;
END $$;
create policy "Admins can view logs" on public.admin_yard_logs for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admins can insert logs" on public.admin_yard_logs for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Anyone can insert logs for promo codes" on public.admin_yard_logs for insert with check (admin_email = 'PROMO_CODE');

-- 5. Trigger to create profile and progress on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || '_' || floor(random() * 10000)::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, is_admin)
  VALUES (
    new.id,
    final_username,
    CASE 
      WHEN new.email = '1karl.ilves@gmail.com' THEN 'Admin✅' 
      ELSE '@' || final_username
    END,
    CASE 
      WHEN new.email = '1karl.ilves@gmail.com' THEN true 
      ELSE false 
    END
  );

  INSERT INTO public.user_progress (user_id, money, yards)
  VALUES (new.id, 0, 0);
  
  INSERT INTO public.user_yards (user_id, yards)
  VALUES (new.id, 0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Retroactively create profiles and progress for existing users
WITH ranked_users AS (
  SELECT 
    id,
    email,
    raw_user_meta_data,
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) as base_username,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) ORDER BY created_at) as rn
  FROM auth.users
)
INSERT INTO public.profiles (id, username, display_name, is_admin)
SELECT 
  id,
  CASE 
    WHEN rn = 1 THEN base_username 
    ELSE base_username || '_' || substr(id::text, 1, 5) 
  END as username,
  CASE 
    WHEN email = '1karl.ilves@gmail.com' THEN 'Admin✅' 
    ELSE '@' || (CASE WHEN rn = 1 THEN base_username ELSE base_username || '_' || substr(id::text, 1, 5) END)
  END as display_name,
  CASE WHEN email = '1karl.ilves@gmail.com' THEN true ELSE false END as is_admin
FROM ranked_users
ON CONFLICT DO NOTHING;

INSERT INTO public.user_progress (user_id, money, yards)
SELECT id, 0, 0
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_yards (user_id, yards)
SELECT id, 0
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

