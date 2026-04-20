
-- 1. Move phone_number / phone_verified to a private table
CREATE TABLE IF NOT EXISTS public.user_contacts (
  user_id uuid PRIMARY KEY,
  phone_number text,
  phone_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.user_contacts (user_id, phone_number, phone_verified)
SELECT user_id, phone_number, COALESCE(phone_verified, false)
FROM public.profiles
WHERE phone_number IS NOT NULL OR phone_verified IS TRUE
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact"
  ON public.user_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all contacts"
  ON public.user_contacts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own contact"
  ON public.user_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contact"
  ON public.user_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contact"
  ON public.user_contacts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_contacts_updated_at
  BEFORE UPDATE ON public.user_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_verified;

-- 2. Lock down notifications inserts
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.notifications;

CREATE OR REPLACE FUNCTION public.can_notify_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.status = 'accepted'
      AND (
        (m.user_id = auth.uid() AND m.matched_user_id = _target_user_id)
        OR (m.matched_user_id = auth.uid() AND m.user_id = _target_user_id)
      )
  )
$$;

CREATE POLICY "Users can notify matched peers only"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id <> auth.uid()
    AND public.can_notify_user(user_id)
  );

-- 3. Avatars storage bucket: remove broad listing
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
