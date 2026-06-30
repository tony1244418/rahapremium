-- Live TV package set: independent subscription columns
-- Adds storage for a separate Live TV subscription that is completely
-- independent from the existing general/movie subscription.
--
-- These columns store JSON strings, matching how `subscription` and
-- `subscription_history` are already handled in the app layer.
-- Absent / NULL means the user has no Live TV subscription.

ALTER TABLE public.rahapremium_users
  ADD COLUMN IF NOT EXISTS live_tv_subscription text;

ALTER TABLE public.rahapremium_users
  ADD COLUMN IF NOT EXISTS live_tv_subscription_history text;

-- Tag payments with the package category they belong to.
-- NULL is treated as 'GENERAL' (existing behavior) by the app layer.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS package_category text;
