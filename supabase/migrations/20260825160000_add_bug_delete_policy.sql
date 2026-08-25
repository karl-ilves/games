-- Add DELETE policy for bug_reports (was missing from previous migration)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can delete bug reports" ON bug_reports;
END $$;
create policy "Anyone can delete bug reports" on public.bug_reports for delete using (true);
