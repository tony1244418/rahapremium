-- Defensive default so payment inserts that omit created_at still get a
-- valid timestamp. Without this, the admin Payment Management dashboard's
-- "Today" / "Yesterday" cards silently report TSH 0 because new Date(null)
-- produces an Invalid Date and rows are filtered out.
ALTER TABLE public.payments
  ALTER COLUMN created_at SET DEFAULT now();

-- Backfill any future stragglers — should be a no-op now after the
-- one-shot script run, but cheap and idempotent.
UPDATE public.payments
SET created_at = COALESCE(completed_at, now())
WHERE created_at IS NULL;
