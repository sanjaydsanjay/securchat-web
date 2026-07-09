-- ============================================================
-- SECURECHAT AI - Seed Data
-- Creates an admin user for initial setup.
-- ============================================================

-- NOTE: Replace with your actual admin email after setting up Supabase.
-- To create an admin user via SQL console (after signup):
-- UPDATE public.users SET is_admin = TRUE WHERE email = 'admin@example.com';

INSERT INTO public.users (auth_id, unique_id, display_name, email, is_admin, message_quota)
SELECT
    id,
    100001,
    'Admin',
    email,
    TRUE,
    999999
FROM auth.users
WHERE email = 'admin@securechat.app'
ON CONFLICT (email) DO NOTHING;
