-- Fix RLS policies for admin operations

-- 1. Admin needs to SELECT any user's yards to do the upsert
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can read all yards" ON user_yards;
END $$;
create policy "Admins can read all yards" on public.user_yards for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 2. Admin needs to INSERT yards for users who don't have a row yet
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can insert yards" ON user_yards;
END $$;
create policy "Admins can insert yards" on public.user_yards for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 3. Admin needs to read/update user_progress too
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can read all progress" ON user_progress;
    DROP POLICY IF EXISTS "Admins can update all progress" ON user_progress;
END $$;
create policy "Admins can read all progress" on public.user_progress for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admins can update all progress" on public.user_progress for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 4. Fix bug_reports: allow anonymous inserts (no auth required for guests)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can submit bug reports" ON bug_reports;
    DROP POLICY IF EXISTS "Anon can submit bug reports" ON bug_reports;
END $$;
create policy "Anon can submit bug reports" on public.bug_reports for insert with check (true);

-- 5. Admin needs to read all bug reports (the existing policy requires is_admin in profiles)
-- This is correct but only works if admin is authenticated in Supabase.
-- Let's also add a service-role bypass: allow select if the user's email matches admin
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can view all bug reports" ON bug_reports;
END $$;
create policy "Admins can view all bug reports" on public.bug_reports for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- 6. Fix admin_yard_logs: admin needs to read logs
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can view logs" ON admin_yard_logs;
END $$;
create policy "Admins can view logs" on public.admin_yard_logs for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
