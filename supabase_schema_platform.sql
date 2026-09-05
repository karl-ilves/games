-- ==============================================================================
-- PLAYARD GAME CREATOR PLATFORM & ADMIN ECOSYSTEM DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. PROFILES TABLE (Username, Display Name)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Remove is_admin column if it previously existed
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- Add birthday / age columns (run once)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert/update their own profile" ON public.profiles;
CREATE POLICY "Users can insert/update their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. USER CREATED GAMES TABLE (Games created via Creator Studio)
CREATE TABLE IF NOT EXISTS public.user_created_games (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_username text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'Adventure',
  thumbnail text DEFAULT '',
  scene_data jsonb NOT NULL,
  status text DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'changes_requested')),
  feedback text DEFAULT '',
  plays integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_created_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved games are viewable by everyone" ON public.user_created_games;
CREATE POLICY "Approved games are viewable by everyone" ON public.user_created_games
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR auth.email() = '1karl.ilves@gmail.com');

DROP POLICY IF EXISTS "Users can create and edit their own games" ON public.user_created_games;
CREATE POLICY "Users can create and edit their own games" ON public.user_created_games
  FOR ALL USING (auth.uid() = user_id OR auth.email() = '1karl.ilves@gmail.com')
  WITH CHECK (auth.uid() = user_id OR auth.email() = '1karl.ilves@gmail.com');

-- 3. ADMIN YARD LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_yard_logs (
  id text PRIMARY KEY,
  admin_email text NOT NULL,
  target_username text NOT NULL,
  amount integer NOT NULL,
  reason text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.admin_yard_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin yard logs viewable by admin" ON public.admin_yard_logs;
CREATE POLICY "Admin yard logs viewable by admin" ON public.admin_yard_logs
  FOR ALL USING (auth.email() = '1karl.ilves@gmail.com')
  WITH CHECK (auth.email() = '1karl.ilves@gmail.com');

-- 4. REDEEMED CODES TABLE (SkyAviation2 promo codes, 1 per user)
CREATE TABLE IF NOT EXISTS public.redeemed_codes (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  code text NOT NULL,
  yards_amount integer NOT NULL,
  redeemed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, code)
);

ALTER TABLE public.redeemed_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and insert their own redeemed codes" ON public.redeemed_codes;
CREATE POLICY "Users can view and insert their own redeemed codes" ON public.redeemed_codes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. PLATFORM UPDATES TABLE (Admin updates sent to Owner database)
CREATE TABLE IF NOT EXISTS public.platform_updates (
  id text PRIMARY KEY,
  title text NOT NULL,
  version text DEFAULT 'v1.0.0',
  content text NOT NULL,
  author_email text DEFAULT 'grx@trenet.ee',
  author_name text DEFAULT 'Admin✅',
  recipient_email text DEFAULT '1karl.ilves@gmail.com',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.platform_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view platform updates" ON public.platform_updates;
CREATE POLICY "Anyone can view platform updates" ON public.platform_updates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can insert platform updates" ON public.platform_updates;
CREATE POLICY "Admin can insert platform updates" ON public.platform_updates
  FOR INSERT WITH CHECK (true);

-- 6. WAR GAME STATS TABLE (3D War Simulator persistence)
CREATE TABLE IF NOT EXISTS public.war_game_stats (
  user_id text PRIMARY KEY,
  username text,
  money integer DEFAULT 0,
  is_plane_unlocked boolean DEFAULT false,
  is_missile_unlocked boolean DEFAULT false,
  kills integer DEFAULT 0,
  matches_won integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.war_game_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read war_game_stats" ON public.war_game_stats;
CREATE POLICY "Public can read war_game_stats" ON public.war_game_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert war_game_stats" ON public.war_game_stats;
CREATE POLICY "Public can insert war_game_stats" ON public.war_game_stats FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update war_game_stats" ON public.war_game_stats;
CREATE POLICY "Public can update war_game_stats" ON public.war_game_stats FOR UPDATE USING (true);

