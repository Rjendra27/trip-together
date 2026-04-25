
-- Add completed flag to trips (manual completion)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

-- Add profile fields for new features
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_group_size text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS budget_preference text;
