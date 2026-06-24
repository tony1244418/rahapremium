-- The Live TV subscription columns were created as text, but the existing
-- subscription columns are jsonb. Writing a JSON object to a text column fails,
-- which broke granting/paying for Live TV subscriptions. Convert to jsonb to
-- match. Columns are NULL so the cast is safe.

ALTER TABLE public.rahapremium_users
  ALTER COLUMN live_tv_subscription TYPE jsonb USING live_tv_subscription::jsonb;

ALTER TABLE public.rahapremium_users
  ALTER COLUMN live_tv_subscription_history TYPE jsonb USING live_tv_subscription_history::jsonb;
