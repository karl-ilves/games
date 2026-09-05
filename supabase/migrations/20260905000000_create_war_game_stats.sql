-- Migration to create war_game_stats table for 3D War Simulator persistence
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can read war_game_stats" ON public.war_game_stats;
    DROP POLICY IF EXISTS "Public can insert war_game_stats" ON public.war_game_stats;
    DROP POLICY IF EXISTS "Public can update war_game_stats" ON public.war_game_stats;
END $$;

CREATE POLICY "Public can read war_game_stats" ON public.war_game_stats FOR SELECT USING (true);
CREATE POLICY "Public can insert war_game_stats" ON public.war_game_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update war_game_stats" ON public.war_game_stats FOR UPDATE USING (true);
