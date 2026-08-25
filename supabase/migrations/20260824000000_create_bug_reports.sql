-- Bug Reports Table
CREATE TABLE IF NOT EXISTS public.bug_reports (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users,
    username text,
    email text,
    title text not null,
    description text not null,
    page text, -- which page the bug was reported from
    status text not null default 'new', -- new, seen, fixed, wontfix
    admin_notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.bug_reports enable row level security;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can submit bug reports" ON bug_reports;
    DROP POLICY IF EXISTS "Users can view own bug reports" ON bug_reports;
    DROP POLICY IF EXISTS "Admins can view all bug reports" ON bug_reports;
    DROP POLICY IF EXISTS "Admins can update bug reports" ON bug_reports;
END $$;

-- Anyone (even guests) can submit a bug report
create policy "Anyone can submit bug reports" on public.bug_reports for insert with check (true);

-- Users can see their own reports
create policy "Users can view own bug reports" on public.bug_reports for select using (auth.uid() = user_id);

-- Admins can see all reports
create policy "Admins can view all bug reports" on public.bug_reports for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Admins can update (change status, add notes)
create policy "Admins can update bug reports" on public.bug_reports for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
