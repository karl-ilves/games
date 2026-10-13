-- ==============================================================================
-- PLAYARD OWNER BAN & COMPLETE DATABASE ROW WIPE POLICIES
-- Enables Playard Owner to ban players and delete 100% of their rows across all tables
-- ==============================================================================

-- 1. Enable DELETE policies on all player-related tables so Owner Panel can wipe player rows
DO $$ BEGIN
    DROP POLICY IF EXISTS "Owner can delete profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Owner can delete user_yards" ON public.user_yards;
    DROP POLICY IF EXISTS "Owner can delete user_progress" ON public.user_progress;
    DROP POLICY IF EXISTS "Owner can delete war_game_stats" ON public.war_game_stats;
    DROP POLICY IF EXISTS "Owner can delete user_avatars" ON public.user_avatars;
    DROP POLICY IF EXISTS "Owner can delete user_avatar_inventory" ON public.user_avatar_inventory;
    DROP POLICY IF EXISTS "Owner can delete user_created_games" ON public.user_created_games;
    DROP POLICY IF EXISTS "Owner can delete redeemed_codes" ON public.redeemed_codes;
    DROP POLICY IF EXISTS "Owner can delete admin_yard_logs" ON public.admin_yard_logs;
END $$;

CREATE POLICY "Owner can delete profiles" ON public.profiles FOR DELETE USING (true);
CREATE POLICY "Owner can delete user_yards" ON public.user_yards FOR DELETE USING (true);
CREATE POLICY "Owner can delete user_progress" ON public.user_progress FOR DELETE USING (true);
CREATE POLICY "Owner can delete war_game_stats" ON public.war_game_stats FOR DELETE USING (true);
CREATE POLICY "Owner can delete user_avatars" ON public.user_avatars FOR DELETE USING (true);
CREATE POLICY "Owner can delete user_avatar_inventory" ON public.user_avatar_inventory FOR DELETE USING (true);
CREATE POLICY "Owner can delete user_created_games" ON public.user_created_games FOR DELETE USING (true);
CREATE POLICY "Owner can delete redeemed_codes" ON public.redeemed_codes FOR DELETE USING (true);
CREATE POLICY "Owner can delete admin_yard_logs" ON public.admin_yard_logs FOR DELETE USING (true);

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
           OR (target_email IS NOT NULL AND lower(email) = lower(target_email))
    LOOP
        DELETE FROM public.user_created_games WHERE user_id::text = uid_rec.uid OR lower(creator_username) = lower(uid_rec.username);
        DELETE FROM public.user_yards WHERE user_id::text = uid_rec.uid;
        DELETE FROM public.user_progress WHERE user_id::text = uid_rec.uid;
        DELETE FROM public.war_game_stats WHERE user_id::text = uid_rec.uid OR lower(username) = lower(uid_rec.username);
        DELETE FROM public.user_avatars WHERE user_id::text = uid_rec.uid;
        DELETE FROM public.user_avatar_inventory WHERE user_id::text = uid_rec.uid;
        DELETE FROM public.redeemed_codes WHERE user_id::text = uid_rec.uid OR lower(username) = lower(uid_rec.username);
        DELETE FROM public.bug_reports WHERE user_id::text = uid_rec.uid OR lower(username) = lower(uid_rec.username);
        DELETE FROM public.admin_yard_logs WHERE lower(target_username) = lower(uid_rec.username);
        DELETE FROM public.profiles WHERE id::text = uid_rec.uid;
        BEGIN
            DELETE FROM auth.users WHERE id::text = uid_rec.uid;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;

    -- Also delete directly by target_username / target_user_id / target_email across all tables
    IF target_username IS NOT NULL THEN
        DELETE FROM public.user_created_games WHERE lower(creator_username) = lower(target_username) OR lower(title) LIKE '%' || lower(target_username) || '%';
        DELETE FROM public.war_game_stats WHERE lower(username) = lower(target_username);
        DELETE FROM public.redeemed_codes WHERE lower(username) = lower(target_username);
        DELETE FROM public.bug_reports WHERE lower(username) = lower(target_username);
        DELETE FROM public.admin_yard_logs WHERE lower(target_username) = lower(target_username);
        DELETE FROM public.profiles WHERE lower(username) = lower(target_username);
    END IF;

    IF target_user_id IS NOT NULL THEN
        DELETE FROM public.user_created_games WHERE user_id::text = target_user_id;
        DELETE FROM public.user_yards WHERE user_id::text = target_user_id;
        DELETE FROM public.user_progress WHERE user_id::text = target_user_id;
        DELETE FROM public.war_game_stats WHERE user_id::text = target_user_id;
        DELETE FROM public.user_avatars WHERE user_id::text = target_user_id;
        DELETE FROM public.user_avatar_inventory WHERE user_id::text = target_user_id;
        DELETE FROM public.redeemed_codes WHERE user_id::text = target_user_id;
        DELETE FROM public.bug_reports WHERE user_id::text = target_user_id;
        DELETE FROM public.profiles WHERE id::text = target_user_id;
    END IF;
END;
$$;
