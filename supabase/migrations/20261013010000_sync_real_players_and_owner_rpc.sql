-- ==============================================================================
-- SYNC ALL REAL PLAYERS FROM auth.users TO public.profiles & OWNER PANEL RPC
-- ==============================================================================

-- 1. Add missing device & is_mobile columns to public.profiles so saveProfileToSupabase never fails
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_mobile boolean;

-- 2. Remove fake automated test bot rows from user_created_games and profiles
DO $$ BEGIN
    DELETE FROM public.user_created_games
    WHERE lower(creator_username) IN ('combat_warrior', 'guestuser', 'tester', 'kawe1234', 'bantestplayer99')
       OR lower(title) LIKE '%kawe1234%'
       OR lower(title) LIKE '%combat_warrior%'
       OR lower(title) LIKE '%guestuser%'
       OR lower(title) LIKE '%bantestplayer99%';

    DELETE FROM public.profiles
    WHERE lower(username) IN ('combat_warrior', 'guestuser', 'tester', 'kawe1234', 'bantestplayer99')
       OR lower(coalesce(email, '')) LIKE '%@player.com'
       OR lower(coalesce(email, '')) LIKE '%@example.com';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Backfill all real accounts from auth.users into public.profiles
DO $$
DECLARE
    u record;
    uname text;
    dname text;
    u_age integer;
    u_birth text;
    u_gender text;
    u_admin boolean;
BEGIN
    FOR u IN
        SELECT id, email, raw_user_meta_data, created_at
        FROM auth.users
        WHERE lower(coalesce(email, '')) NOT LIKE '%@player.com'
          AND lower(coalesce(email, '')) NOT LIKE '%@example.com'
          AND lower(coalesce(email, '')) NOT LIKE 'test@%'
          AND lower(coalesce(email, '')) NOT LIKE 'kawe1234%'
          AND lower(coalesce(email, '')) NOT LIKE 'bantestplayer%'
    LOOP
        uname := trim(coalesce(u.raw_user_meta_data->>'username', split_part(coalesce(u.email, ''), '@', 1)));
        IF uname IS NOT NULL AND uname <> '' AND lower(uname) NOT IN ('combat_warrior', 'guestuser', 'tester', 'kawe1234', 'bantestplayer99') THEN
            IF lower(coalesce(u.email, '')) IN ('1karl.ilves@gmail.com', '1karl.ilves@gmailo.com', '1karl.iles@gmail.com') THEN
                uname := 'playard owner';
                dname := 'Playard Owner ✔';
                u_admin := true;
            ELSIF lower(coalesce(u.email, '')) = 'grx@trenet.ee' THEN
                uname := 'admin';
                dname := 'Admin✅';
                u_admin := true;
            ELSE
                dname := '@' || uname;
                u_admin := false;
            END IF;

            u_birth := u.raw_user_meta_data->>'birth_date';
            u_gender := u.raw_user_meta_data->>'gender';
            u_age := NULL;
            IF (u.raw_user_meta_data->>'age') IS NOT NULL AND (u.raw_user_meta_data->>'age') ~ '^[0-9]+$' THEN
                u_age := (u.raw_user_meta_data->>'age')::integer;
            END IF;

            BEGIN
                INSERT INTO public.profiles (id, username, display_name, email, is_admin, birth_date, age, gender, created_at)
                VALUES (u.id, uname, dname, u.email, u_admin, u_birth, u_age, u_gender, coalesce(u.created_at, now()))
                ON CONFLICT (id) DO UPDATE SET
                    email = coalesce(public.profiles.email, EXCLUDED.email),
                    birth_date = coalesce(public.profiles.birth_date, EXCLUDED.birth_date),
                    age = coalesce(public.profiles.age, EXCLUDED.age),
                    gender = coalesce(public.profiles.gender, EXCLUDED.gender);
            EXCEPTION WHEN unique_violation THEN
                UPDATE public.profiles
                SET email = coalesce(public.profiles.email, u.email),
                    birth_date = coalesce(public.profiles.birth_date, u_birth),
                    age = coalesce(public.profiles.age, u_age),
                    gender = coalesce(public.profiles.gender, u_gender)
                WHERE lower(username) = lower(uname);
            WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END LOOP;
END $$;

-- 4. Security Definer RPC to fetch all real Playard players for Owner Panel (reads profiles + auth.users)
CREATE OR REPLACE FUNCTION public.get_all_playard_players()
RETURNS TABLE (
    id text,
    username text,
    display_name text,
    email text,
    is_admin boolean,
    age integer,
    gender text,
    birth_date text,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (lower(coalesce(p.username, u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))))
        coalesce(p.id::text, u.id::text) AS id,
        coalesce(p.username, u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))::text AS username,
        coalesce(
            p.display_name,
            CASE
                WHEN lower(u.email) IN ('1karl.ilves@gmail.com', '1karl.ilves@gmailo.com', '1karl.iles@gmail.com') THEN 'Playard Owner ✔'
                WHEN lower(u.email) = 'grx@trenet.ee' THEN 'Admin✅'
                ELSE '@' || coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
            END
        )::text AS display_name,
        coalesce(p.email, u.email, '')::text AS email,
        coalesce(p.is_admin, false) AS is_admin,
        coalesce(
            p.age,
            CASE WHEN (u.raw_user_meta_data->>'age') ~ '^[0-9]+$' THEN (u.raw_user_meta_data->>'age')::integer ELSE NULL END
        ) AS age,
        coalesce(p.gender, u.raw_user_meta_data->>'gender')::text AS gender,
        coalesce(p.birth_date, u.raw_user_meta_data->>'birth_date')::text AS birth_date,
        coalesce(p.created_at, u.created_at, now()) AS created_at
    FROM public.profiles p
    FULL OUTER JOIN auth.users u ON p.id = u.id
    WHERE coalesce(p.username, u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) IS NOT NULL
      AND lower(coalesce(p.username, u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))) NOT IN (
          'combat_warrior', 'guestuser', 'tester', 'kawe1234', 'bantestplayer99'
      )
      AND lower(coalesce(p.email, u.email, '')) NOT LIKE '%@player.com'
      AND lower(coalesce(p.email, u.email, '')) NOT LIKE '%@example.com'
    ORDER BY lower(coalesce(p.username, u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))), p.created_at ASC NULLS LAST;
END;
$$;
