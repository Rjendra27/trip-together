
-- Add blocked flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Admin policies on trips
CREATE POLICY "Admins can update any trip"
ON public.trips FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any trip"
ON public.trips FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any profile (block users)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Notifications: admins can insert (for broadcasts) and view all
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow any authenticated user to insert notifications addressed to others (matches/messages triggers later)
CREATE POLICY "Users can create notifications for others"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admin manages user roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
