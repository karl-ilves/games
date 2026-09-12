-- Migration: Create user_avatars and user_avatar_inventory tables with public RLS policies
CREATE TABLE IF NOT EXISTS public.user_avatars (
  user_id text PRIMARY KEY,
  body_id text DEFAULT 'body_standard',
  skin_color text DEFAULT '#f5d0b5',
  face_id text DEFAULT 'face_smile',
  hair_id text DEFAULT 'hair_classic',
  hair_color text DEFAULT '#221812',
  top_id text DEFAULT 'top_hoodie_cyan',
  pants_id text DEFAULT 'pants_jeans_dark',
  shoes_id text DEFAULT 'shoes_sneakers_white',
  hat_id text DEFAULT NULL,
  accessory_id text DEFAULT NULL,
  back_accessory_id text DEFAULT NULL,
  active_emote text DEFAULT 'idle',
  movement_style text DEFAULT 'anim_style_default',
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read user_avatars" ON public.user_avatars;
CREATE POLICY "Public can read user_avatars" ON public.user_avatars FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can upsert user_avatars" ON public.user_avatars;
CREATE POLICY "Public can upsert user_avatars" ON public.user_avatars FOR ALL USING (true) WITH CHECK (true);

-- User avatar inventory table
CREATE TABLE IF NOT EXISTS public.user_avatar_inventory (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  item_id text NOT NULL,
  acquired_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_avatar_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read user_avatar_inventory" ON public.user_avatar_inventory;
CREATE POLICY "Public can read user_avatar_inventory" ON public.user_avatar_inventory FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can insert user_avatar_inventory" ON public.user_avatar_inventory;
CREATE POLICY "Public can insert user_avatar_inventory" ON public.user_avatar_inventory FOR INSERT WITH CHECK (true);
