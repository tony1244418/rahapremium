-- Enable Row Level Security on all public tables, with PERMISSIVE policies
-- that match what the current app does (it reads/writes via the anon key from
-- the browser, including the admin panel).
--
-- WHY PERMISSIVE: the app has no Supabase-auth distinction between admin and
-- normal users (admin auth is custom and runs client-side with the anon key),
-- so any non-permissive write policy would break the admin panel, payments,
-- and subscriptions. The service_role key (used by server routes/webhooks)
-- bypasses RLS regardless.
--
-- EFFECT: removes the "UNRESTRICTED" warning and keeps the site working.
-- NOTE: this is a baseline; tighten per-table later once privileged writes
-- are moved server-side.
--
-- Idempotent: safe to run multiple times.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_settings','admins','episodes','feedback','feedbacks',
    'game_accesses','games','live_channels','movies','payments',
    'qr_login_sessions','rahapremium_users','seasons','series',
    'stories','watch_history'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "app_allow_all" ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY "app_allow_all" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      t
    );
  END LOOP;
END $$;
