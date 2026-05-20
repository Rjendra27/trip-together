
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.join_request_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.trip_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  trip_owner_id UUID NOT NULL,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trip_join_requests_unique UNIQUE (trip_id, requester_id),
  CONSTRAINT requester_not_owner CHECK (requester_id <> trip_owner_id)
);

CREATE INDEX IF NOT EXISTS idx_tjr_owner ON public.trip_join_requests (trip_owner_id, status);
CREATE INDEX IF NOT EXISTS idx_tjr_requester ON public.trip_join_requests (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_tjr_trip ON public.trip_join_requests (trip_id);

ALTER TABLE public.trip_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS
CREATE POLICY "Involved users can view requests"
  ON public.trip_join_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = trip_owner_id);

CREATE POLICY "Requesters can create"
  ON public.trip_join_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id
    AND auth.uid() <> trip_owner_id
    AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = trip_owner_id)
  );

CREATE POLICY "Owner can update status"
  ON public.trip_join_requests FOR UPDATE
  USING (auth.uid() = trip_owner_id);

CREATE POLICY "Requester can cancel"
  ON public.trip_join_requests FOR DELETE
  USING (auth.uid() = requester_id AND status = 'pending');

-- updated_at trigger
CREATE TRIGGER trg_tjr_updated_at
  BEFORE UPDATE ON public.trip_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger (security definer to bypass notifications RLS)
CREATE OR REPLACE FUNCTION public.handle_join_request_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dest TEXT;
  v_requester_name TEXT;
BEGIN
  SELECT destination INTO v_dest FROM public.trips WHERE id = NEW.trip_id;

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(display_name, 'A traveler') INTO v_requester_name
      FROM public.profiles WHERE user_id = NEW.requester_id;

    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (
      NEW.trip_owner_id,
      'join_request',
      'New join request',
      COALESCE(v_requester_name, 'Someone') || ' requested to join your ' || COALESCE(v_dest, 'trip') || ' trip.',
      NEW.id::text
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, type, title, body, related_id)
      VALUES (
        NEW.requester_id,
        'join_accepted',
        'Request accepted',
        'Your request to join the ' || COALESCE(v_dest, 'trip') || ' trip was accepted.',
        NEW.trip_id::text
      );

      -- bump spots_filled (capped at spots_needed)
      UPDATE public.trips
        SET spots_filled = LEAST(COALESCE(spots_needed, 1), COALESCE(spots_filled, 0) + 1)
        WHERE id = NEW.trip_id;
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, related_id)
      VALUES (
        NEW.requester_id,
        'join_rejected',
        'Request declined',
        'Your request to join the ' || COALESCE(v_dest, 'trip') || ' trip was declined.',
        NEW.trip_id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tjr_notify_ins ON public.trip_join_requests;
CREATE TRIGGER trg_tjr_notify_ins
  AFTER INSERT ON public.trip_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_join_request_notify();

DROP TRIGGER IF EXISTS trg_tjr_notify_upd ON public.trip_join_requests;
CREATE TRIGGER trg_tjr_notify_upd
  AFTER UPDATE ON public.trip_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_join_request_notify();

-- Realtime
ALTER TABLE public.trip_join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_join_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
