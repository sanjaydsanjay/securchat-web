BEGIN;

-- We plan 15 tests. If the number of tests changes, update this number.
SELECT plan(13);

-- ============================================================
-- HELPER FUNCTIONS FOR RLS TESTING
-- ============================================================
CREATE OR REPLACE FUNCTION tests_set_auth_user(user_id UUID) RETURNS VOID AS $$
BEGIN
    -- Set the JWT claim to mimic an authenticated user
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', user_id), true);
    PERFORM set_config('role', 'authenticated', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tests_clear_auth() RETURNS VOID AS $$
BEGIN
    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('role', 'anon', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TEST DATA SETUP
-- ============================================================
-- Insert mock auth users
INSERT INTO auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at) VALUES 
('00000000-0000-0000-0000-000000000001', 'user1@test.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '123', NOW(), NOW()),
('00000000-0000-0000-0000-000000000002', 'user2@test.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '123', NOW(), NOW()),
('00000000-0000-0000-0000-000000000003', 'user3@test.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '123', NOW(), NOW());

-- Insert public user profiles
INSERT INTO public.users (auth_id, unique_id, email, display_name) VALUES
('00000000-0000-0000-0000-000000000001', 111111, 'user1@test.com', 'User 1'),
('00000000-0000-0000-0000-000000000002', 222222, 'user2@test.com', 'User 2'),
('00000000-0000-0000-0000-000000000003', 333333, 'user3@test.com', 'User 3');

-- Insert a chat between User 1 and User 2
INSERT INTO public.chats (id, participant_1_id, participant_2_id) VALUES
('11111111-1111-1111-1111-111111111111', 111111, 222222);

-- Insert messages in the chat
INSERT INTO public.messages (id, chat_id, sender_unique_id, content) VALUES
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 111111, 'Hello User 2'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 222222, 'Hi User 1');

-- Insert an audit log
INSERT INTO public.audit_logs (action, resource_type, description) VALUES
('system.start', 'system', 'System started');

-- ============================================================
-- 1. USERS TABLE TESTS
-- ============================================================
SELECT tests_set_auth_user('00000000-0000-0000-0000-000000000001');

SELECT results_eq(
    'SELECT unique_id FROM public.users',
    ARRAY[111111],
    'Users can read their own profile and cannot read another user''s profile'
);

SELECT lives_ok(
    $$ UPDATE public.users SET display_name = 'User 1 Modified' WHERE unique_id = 111111 $$,
    'Users can update their own profile'
);

SELECT throws_ok(
    $$ UPDATE public.users SET display_name = 'Hacked' WHERE unique_id = 222222 $$,
    'Users cannot update another user''s profile'
);

-- ============================================================
-- 2. CHATS TABLE TESTS
-- ============================================================
SELECT tests_set_auth_user('00000000-0000-0000-0000-000000000003');

SELECT is_empty(
    'SELECT * FROM public.chats',
    'Non-participants (User 3) cannot access chats between User 1 and User 2'
);

SELECT tests_set_auth_user('00000000-0000-0000-0000-000000000001');

SELECT results_eq(
    'SELECT id FROM public.chats',
    ARRAY['11111111-1111-1111-1111-111111111111'::UUID],
    'Only chat participants (User 1) can view their chat'
);

-- ============================================================
-- 3. MESSAGES TABLE TESTS
-- ============================================================
SELECT tests_set_auth_user('00000000-0000-0000-0000-000000000003');

SELECT is_empty(
    'SELECT * FROM public.messages',
    'Non-participants (User 3) cannot read messages in a chat they don''t belong to'
);

SELECT tests_set_auth_user('00000000-0000-0000-0000-000000000001');

SELECT results_eq(
    'SELECT content FROM public.messages ORDER BY created_at',
    ARRAY['Hello User 2', 'Hi User 1'],
    'Chat participants (User 1) can read all messages in their chat'
);

SELECT throws_ok(
    $$ INSERT INTO public.messages (chat_id, sender_unique_id, content) VALUES ('11111111-1111-1111-1111-111111111111', 222222, 'Spoofed message') $$,
    'Users can send messages only as themselves (User 1 cannot send as User 2)'
);

SELECT throws_ok(
    $$ UPDATE public.messages SET content = 'Hacked' WHERE id = '22222222-2222-2222-2222-222222222222' $$,
    'Users cannot modify another user''s messages'
);

-- ============================================================
-- 4. STORAGE ACCESS LOGIC TESTS (Database Representation)
-- ============================================================
-- Note: Direct storage bucket operations via pgTAP are limited to testing the policies on storage.objects.
-- We verify that the policy functions restrict correctly.
SELECT tests_set_auth_user('00000000-0000-0000-0000-000000000003');

SELECT is_empty(
    $$ SELECT id FROM storage.objects WHERE bucket_id = 'chat-media' $$,
    'Users can access only files they are authorized to access (via storage policies)'
);

-- ============================================================
-- 5. AUDIT LOGS TESTS
-- ============================================================
SELECT tests_set_auth_user('00000000-0000-0000-0000-000000000001');

SELECT is_empty(
    'SELECT * FROM public.audit_logs',
    'Regular users cannot read audit logs'
);

SELECT throws_ok(
    $$ INSERT INTO public.audit_logs (action, description) VALUES ('hacked', 'hacked') $$,
    'Regular users cannot modify or insert into audit logs'
);

-- Service Role Bypass Verification
SELECT tests_clear_auth();
-- Postgres superuser (postgres role in pgTAP context) bypasses RLS
SELECT results_eq(
    'SELECT action FROM public.audit_logs',
    ARRAY['system.start'],
    'Service role / Admin bypasses RLS to read audit logs natively'
);

-- Finish the tests and clean up
SELECT * FROM finish();
ROLLBACK;
