-- Fix RLS policies for user_created_games and bug_reports
-- Ensures that games submitted for review and bug reports always reach Supabase

-- 1. Fix user_created_games
DO $$ BEGIN
    DROP POLICY IF EXISTS "Games are viewable by everyone" ON public.user_created_games;
    DROP POLICY IF EXISTS "Users can insert their own games" ON public.user_created_games;
    DROP POLICY IF EXISTS "Users can update their own games" ON public.user_created_games;
    DROP POLICY IF EXISTS "Admins can update any game" ON public.user_created_games;
    DROP POLICY IF EXISTS "Approved games are viewable by everyone" ON public.user_created_games;
    DROP POLICY IF EXISTS "Users can create and edit their own games" ON public.user_created_games;
    DROP POLICY IF EXISTS "Anyone can submit games" ON public.user_created_games;
    DROP POLICY IF EXISTS "Anyone can update games" ON public.user_created_games;
END $$;

-- Allow everyone to view games
CREATE POLICY "Games are viewable by everyone" ON public.user_created_games
    FOR SELECT USING (true);

-- Allow anyone to submit games for review
CREATE POLICY "Anyone can submit games" ON public.user_created_games
    FOR INSERT WITH CHECK (true);

-- Allow updates (for admin review approval/rejection and archive transitions)
CREATE POLICY "Anyone can update games" ON public.user_created_games
    FOR UPDATE USING (true);

-- 2. Ensure bug_reports RLS policies allow insertion and viewing
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can submit bug reports" ON public.bug_reports;
    DROP POLICY IF EXISTS "Anon can submit bug reports" ON public.bug_reports;
    DROP POLICY IF EXISTS "Public can read bug reports" ON public.bug_reports;
    DROP POLICY IF EXISTS "Anyone can update bug reports" ON public.bug_reports;
    DROP POLICY IF EXISTS "Anyone can delete bug reports" ON public.bug_reports;
END $$;

CREATE POLICY "Anyone can submit bug reports" ON public.bug_reports
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read bug reports" ON public.bug_reports
    FOR SELECT USING (true);

CREATE POLICY "Anyone can update bug reports" ON public.bug_reports
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete bug reports" ON public.bug_reports
    FOR DELETE USING (true);
