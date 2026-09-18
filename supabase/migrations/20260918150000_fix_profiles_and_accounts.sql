-- ==============================================================================
-- PLAYARD SUPABASE DATABASE SCHEMA FIX FOR PROFILES & ACCOUNTS
-- Käivita see Supabase SQL Editoris (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Lisa profiles tabelisse puuduvad veerud (email, birth_date, age, gender)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;

-- 2. Eemalda range foreign key piirang profiles.id -> auth.users.id
-- See võimaldab profiile luua ja sünkroniseerida ka otse, kui Supabase Auth e-posti saatja on limiidis
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Eemalda range foreign key piirang user_yards.user_id -> auth.users.id
ALTER TABLE public.user_yards DROP CONSTRAINT IF EXISTS user_yards_user_id_fkey;

-- 4. Uuenda RLS poliitikaid public.profiles tabelil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert/update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
END $$;

-- Kõik saavad profiile lugeda
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

-- Lubab profiilide lisamist (nii autenditud kasutajatel kui ka registreerumisel)
CREATE POLICY "Anyone can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- Lubab profiilide uuendamist
CREATE POLICY "Anyone can update profiles" ON public.profiles
    FOR UPDATE USING (true);

-- 5. Uuenda handle_new_user triggerit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  meta_age integer;
  meta_gender text;
  meta_birth_date text;
BEGIN
  base_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || '_' || floor(random() * 10000)::text;
  END LOOP;

  meta_age := (new.raw_user_meta_data->>'age')::integer;
  meta_gender := new.raw_user_meta_data->>'gender';
  meta_birth_date := new.raw_user_meta_data->>'birth_date';

  INSERT INTO public.profiles (id, username, email, display_name, is_admin, birth_date, age, gender)
  VALUES (
    new.id,
    final_username,
    new.email,
    CASE 
      WHEN new.email = '1karl.ilves@gmail.com' THEN 'Playard Owner✅' 
      WHEN new.email = 'grx@trenet.ee' THEN 'Admin✅'
      ELSE '@' || final_username
    END,
    CASE 
      WHEN new.email = '1karl.ilves@gmail.com' THEN true 
      ELSE false 
    END,
    meta_birth_date,
    meta_age,
    meta_gender
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    age = COALESCE(EXCLUDED.age, profiles.age),
    gender = COALESCE(EXCLUDED.gender, profiles.gender);

  INSERT INTO public.user_progress (user_id, money, yards)
  VALUES (new.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_yards (user_id, yards)
  VALUES (new.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- OLULINE MEELDETULETUS:
-- Mine Supabase Dashboardi: Authentication -> Providers -> Email
-- Lülita "Confirm email" VÄLJA (Toggle OFF).
-- Siis saavad kõik kasutajad kohe ilma e-posti kinnitamise ja saatmislimiidita kontosid luua!
-- ==============================================================================
