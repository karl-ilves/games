CREATE TABLE IF NOT EXISTS user_progress (
    user_id uuid references auth.users not null primary key,
    money integer default 0,
    selected_level integer default 1,
    unlocked_vehicles text[] default '{"car_1"}',
    vehicle_upgrades jsonb default '{}',
    level2_unlocked boolean default false,
    level3_unlocked boolean default false,
    level4_unlocked boolean default false
);

-- Enable Row Level Security (RLS)
alter table user_progress enable row level security;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own progress" ON user_progress;
    DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
    DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
END $$;

create policy "Users can read own progress" on user_progress for select using (auth.uid() = user_id);
create policy "Users can update own progress" on user_progress for update using (auth.uid() = user_id);
create policy "Users can insert own progress" on user_progress for insert with check (auth.uid() = user_id);
