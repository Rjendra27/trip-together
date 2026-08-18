-- Delete all users from the auth.users table
-- This will cascade delete all corresponding profiles, trips, messages, matches, and other user data.
TRUNCATE auth.users CASCADE;
