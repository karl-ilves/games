-- ==============================================================================
-- PLAYARD SUPABASE DATABASE SETUP FOR YARD CURRENCY & PROGRESS
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Add Yard currency columns to existing user_progress table
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS yards integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_claim_timestamp bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yard_inventory jsonb DEFAULT '[]'::jsonb;

-- 2. Create dedicated user_yards table for granular cloud sync
CREATE TABLE IF NOT EXISTS public.user_yards (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  yards integer DEFAULT 0,
  streak integer DEFAULT 0,
  last_claim_timestamp bigint DEFAULT 0,
  inventory jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Enable Row Level Security (RLS) on user_yards
ALTER TABLE public.user_yards ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for user_yards (Users can read and write only their own records)
DROP POLICY IF EXISTS "Users can select their own yards" ON public.user_yards;
CREATE POLICY "Users can select their own yards" ON public.user_yards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert/update their own yards" ON public.user_yards;
CREATE POLICY "Users can insert/update their own yards" ON public.user_yards
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
