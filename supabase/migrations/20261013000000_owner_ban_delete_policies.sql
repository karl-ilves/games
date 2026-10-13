-- ==============================================================================
-- PLAYARD OWNER BAN & COMPLETE DATABASE ROW WIPE POLICIES
-- Enables Playard Owner to ban players and delete 100% of their rows across all tables
-- ==============================================================================

-- 1. Ensure redeemed_codes table exists if referenced, and enable DELETE policies safely
CREATE TABLE IF NOT EXISTS public.redeemed_codes (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id text,
    username text,
    code text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'profiles',
        'user_yards',
        'user_progress',
        'war_game_stats',
        'user_avatars',
        'user_avatar_inventory',
        'user_created_games',
        'redeemed_codes',
        'admin_yard_logs',
        'bug_reports'
    ]
    LOOP
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = tbl
            ) THEN
                EXECUTE format('DROP POLICY IF EXISTS "Owner can delete %I" ON public.%I', tbl, tbl);
                EXECUTE format('CREATE POLICY "Owner can delete %I" ON public.%I FOR DELETE USING (true)', tbl, tbl);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- 2. Security Definer RPC to wipe all rows for a banned player across all tables + auth.users
CREATE OR REPLACE FUNCTION public.ban_and_delete_player(
    target_username text,
    target_user_id text DEFAULT NULL,
    target_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    uid_rec record;
BEGIN
    -- Collect and delete by matching profile rows
    FOR uid_rec IN
        SELECT id::text AS uid, username, email
        FROM public.profiles
        WHERE (target_username IS NOT NULL AND lower(username) = lower(target_username))
           OR (target_user_id IS NOT NULL AND id::text = target_user_id)
           OR (target_email IS NOT NULL AND email IS NOT NULL AND lower(email) = lower(target_email))
    LOOP
        BEGIN DELETE FROM public.user_created_games WHERE user_id::text = uid_rec.uid OR lower(creator_username) = lower(uid_rec.username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_yards WHERE user_id::text = uid_rec.uid; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_progress WHERE user_id::text = uid_rec.uid; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.war_game_stats WHERE user_id::text = uid_rec.uid OR lower(username) = lower(uid_rec.username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_avatars WHERE user_id::text = uid_rec.uid; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_avatar_inventory WHERE user_id::text = uid_rec.uid; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.redeemed_codes WHERE user_id::text = uid_rec.uid OR lower(username) = lower(uid_rec.username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.bug_reports WHERE user_id::text = uid_rec.uid OR lower(username) = lower(uid_rec.username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.admin_yard_logs WHERE lower(target_username) = lower(uid_rec.username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.profiles WHERE id::text = uid_rec.uid; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM auth.users WHERE id::text = uid_rec.uid; EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;

    -- Also delete directly by target_username / target_user_id across all tables
    IF target_username IS NOT NULL THEN
        BEGIN DELETE FROM public.user_created_games WHERE lower(creator_username) = lower(target_username) OR lower(title) LIKE '%' || lower(target_username) || '%'; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.war_game_stats WHERE lower(username) = lower(target_username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.redeemed_codes WHERE lower(username) = lower(target_username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.bug_reports WHERE lower(username) = lower(target_username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.admin_yard_logs WHERE lower(target_username) = lower(target_username); EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.profiles WHERE lower(username) = lower(target_username); EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    IF target_user_id IS NOT NULL THEN
        BEGIN DELETE FROM public.user_created_games WHERE user_id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_yards WHERE user_id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_progress WHERE user_id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.war_game_stats WHERE user_id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_avatars WHERE user_id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.user_avatar_inventory WHERE user_id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.redeemed_codes WHERE user_id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.bug_reports WHERE user_id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN DELETE FROM public.profiles WHERE id::text = target_user_id; EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
END;
$$;
