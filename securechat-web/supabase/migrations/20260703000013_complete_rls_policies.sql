-- ============================================================
-- SECURECHAT AI - Complete Production-Ready RLS Policies
-- Performance Optimized with STABLE functions
-- Includes Security Best Practices
-- ============================================================

-- ============================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- By making these STABLE and SECURITY DEFINER, PostgreSQL can 
-- cache the result per statement, dramatically speeding up RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_unique_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT unique_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT is_admin FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- CLEAR EXISTING POLICIES (Idempotent cleanup)
-- ============================================================
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "users_read_public" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_update" ON public.users;
DROP POLICY IF EXISTS "prevent_user_delete" ON public.users;

DROP POLICY IF EXISTS "chats_select_participant" ON public.chats;
DROP POLICY IF EXISTS "chats_insert_authenticated" ON public.chats;
DROP POLICY IF EXISTS "chats_update_participant" ON public.chats;

DROP POLICY IF EXISTS "members_select_own" ON public.chat_members;
DROP POLICY IF EXISTS "members_insert_self" ON public.chat_members;

DROP POLICY IF EXISTS "messages_select_own_chats" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_expired" ON public.messages;

DROP POLICY IF EXISTS "reports_insert_authenticated" ON public.reports;
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
DROP POLICY IF EXISTS "reports_admin_update" ON public.reports;

DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_update" ON public.payments;

DROP POLICY IF EXISTS "scheduled_select_own" ON public.scheduled_messages;
DROP POLICY IF EXISTS "scheduled_insert_own" ON public.scheduled_messages;
DROP POLICY IF EXISTS "scheduled_update_own" ON public.scheduled_messages;

DROP POLICY IF EXISTS "audit_admin_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_no_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_no_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_no_delete" ON public.audit_logs;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================
-- SELECT: Users can read their own profile, or public info of non-banned users, or admins can read all
CREATE POLICY "users_select" ON public.users
    FOR SELECT
    USING (
        auth_id = auth.uid() 
        OR (is_banned = FALSE)
        OR public.is_admin()
    );

-- INSERT: Only allow if auth_id matches the authenticated user (handled mostly by trigger)
CREATE POLICY "users_insert" ON public.users
    FOR INSERT
    WITH CHECK (auth_id = auth.uid());

-- UPDATE: Users can update their own profile, admins can update any
CREATE POLICY "users_update" ON public.users
    FOR UPDATE
    USING (auth_id = auth.uid() OR public.is_admin())
    WITH CHECK (auth_id = auth.uid() OR public.is_admin());

-- DELETE: Prevent manual deletion, rely on cascade from auth.users or admin actions
CREATE POLICY "users_delete" ON public.users
    FOR DELETE
    USING (public.is_admin());

-- ============================================================
-- CHATS
-- ============================================================
-- SELECT: Participants can read their chats
CREATE POLICY "chats_select" ON public.chats
    FOR SELECT
    USING (
        participant_1_id = public.get_current_user_unique_id()
        OR participant_2_id = public.get_current_user_unique_id()
    );

-- INSERT: User must be one of the participants
CREATE POLICY "chats_insert" ON public.chats
    FOR INSERT
    WITH CHECK (
        participant_1_id = public.get_current_user_unique_id()
        OR participant_2_id = public.get_current_user_unique_id()
    );

-- UPDATE: Participants can update chat settings
CREATE POLICY "chats_update" ON public.chats
    FOR UPDATE
    USING (
        participant_1_id = public.get_current_user_unique_id()
        OR participant_2_id = public.get_current_user_unique_id()
    )
    WITH CHECK (
        participant_1_id = public.get_current_user_unique_id()
        OR participant_2_id = public.get_current_user_unique_id()
    );

-- DELETE: Soft-delete via archive function, so block actual deletes
CREATE POLICY "chats_delete" ON public.chats
    FOR DELETE
    USING (FALSE);

-- ============================================================
-- CHAT MEMBERS
-- ============================================================
CREATE POLICY "members_select" ON public.chat_members
    FOR SELECT
    USING (user_unique_id = public.get_current_user_unique_id());

CREATE POLICY "members_insert" ON public.chat_members
    FOR INSERT
    WITH CHECK (user_unique_id = public.get_current_user_unique_id());

CREATE POLICY "members_update" ON public.chat_members
    FOR UPDATE
    USING (user_unique_id = public.get_current_user_unique_id());

CREATE POLICY "members_delete" ON public.chat_members
    FOR DELETE
    USING (user_unique_id = public.get_current_user_unique_id());

-- ============================================================
-- MESSAGES
-- ============================================================
-- SELECT: Users can only see messages in chats they participate in
CREATE POLICY "messages_select" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE id = messages.chat_id 
            AND (participant_1_id = public.get_current_user_unique_id() OR participant_2_id = public.get_current_user_unique_id())
        )
    );

-- INSERT: Sender must be the user, and must belong to the chat
CREATE POLICY "messages_insert" ON public.messages
    FOR INSERT
    WITH CHECK (
        sender_unique_id = public.get_current_user_unique_id()
        AND EXISTS (
            SELECT 1 FROM public.chats 
            WHERE id = chat_id 
            AND (participant_1_id = public.get_current_user_unique_id() OR participant_2_id = public.get_current_user_unique_id())
        )
    );

-- UPDATE: Sender can update their own messages (e.g. edit content)
CREATE POLICY "messages_update" ON public.messages
    FOR UPDATE
    USING (sender_unique_id = public.get_current_user_unique_id())
    WITH CHECK (sender_unique_id = public.get_current_user_unique_id());

-- DELETE: Soft-delete is used. Service role handles actual purging.
CREATE POLICY "messages_delete" ON public.messages
    FOR DELETE
    USING (FALSE);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE POLICY "reports_select" ON public.reports
    FOR SELECT
    USING (
        reporter_unique_id = public.get_current_user_unique_id()
        OR reported_unique_id = public.get_current_user_unique_id()
        OR public.is_admin()
    );

CREATE POLICY "reports_insert" ON public.reports
    FOR INSERT
    WITH CHECK (reporter_unique_id = public.get_current_user_unique_id());

CREATE POLICY "reports_update" ON public.reports
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "reports_delete" ON public.reports
    FOR DELETE
    USING (public.is_admin());

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE POLICY "payments_select" ON public.payments
    FOR SELECT
    USING (
        user_unique_id = public.get_current_user_unique_id()
        OR public.is_admin()
    );

CREATE POLICY "payments_insert" ON public.payments
    FOR INSERT
    WITH CHECK (user_unique_id = public.get_current_user_unique_id());

CREATE POLICY "payments_update" ON public.payments
    FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "payments_delete" ON public.payments
    FOR DELETE
    USING (FALSE);

-- ============================================================
-- SCHEDULED MESSAGES
-- ============================================================
CREATE POLICY "scheduled_select" ON public.scheduled_messages
    FOR SELECT
    USING (sender_unique_id = public.get_current_user_unique_id());

CREATE POLICY "scheduled_insert" ON public.scheduled_messages
    FOR INSERT
    WITH CHECK (
        sender_unique_id = public.get_current_user_unique_id()
        AND EXISTS (
            SELECT 1 FROM public.chats 
            WHERE id = chat_id 
            AND (participant_1_id = public.get_current_user_unique_id() OR participant_2_id = public.get_current_user_unique_id())
        )
    );

CREATE POLICY "scheduled_update" ON public.scheduled_messages
    FOR UPDATE
    USING (sender_unique_id = public.get_current_user_unique_id());

CREATE POLICY "scheduled_delete" ON public.scheduled_messages
    FOR DELETE
    USING (sender_unique_id = public.get_current_user_unique_id());

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE POLICY "audit_select" ON public.audit_logs
    FOR SELECT
    USING (public.is_admin());

CREATE POLICY "audit_insert" ON public.audit_logs
    FOR INSERT
    WITH CHECK (FALSE); -- Only Service Role / RPC can insert

CREATE POLICY "audit_update" ON public.audit_logs
    FOR UPDATE
    USING (FALSE);

CREATE POLICY "audit_delete" ON public.audit_logs
    FOR DELETE
    USING (FALSE);

-- ============================================================
-- STORAGE RLS
-- ============================================================
-- Drop existing to replace with optimized
DROP POLICY IF EXISTS "chat_media_select" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatar_select" ON storage.objects;
DROP POLICY IF EXISTS "avatar_insert" ON storage.objects;
DROP POLICY IF EXISTS "payment_screenshot_select" ON storage.objects;
DROP POLICY IF EXISTS "payment_screenshot_insert" ON storage.objects;
DROP POLICY IF EXISTS "voice_notes_select" ON storage.objects;
DROP POLICY IF EXISTS "voice_notes_insert" ON storage.objects;
DROP POLICY IF EXISTS "voice_notes_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;

-- Chat Media (Private)
CREATE POLICY "chat_media_select" ON storage.objects FOR SELECT USING (
    bucket_id = 'chat-media' AND EXISTS (
        SELECT 1 FROM public.chats
        WHERE id::TEXT = (string_to_array(name, '/'))[1]
        AND (participant_1_id = public.get_current_user_unique_id() OR participant_2_id = public.get_current_user_unique_id())
    )
);
CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');
CREATE POLICY "chat_media_update" ON storage.objects FOR UPDATE USING (bucket_id = 'chat-media' AND auth.role() = 'authenticated');
CREATE POLICY "chat_media_delete" ON storage.objects FOR DELETE USING (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

-- Avatars
CREATE POLICY "avatar_select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatar_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatar_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Payment Screenshots (Private)
CREATE POLICY "payment_screenshot_select" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots' AND public.is_admin());
CREATE POLICY "payment_screenshot_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots' AND auth.role() = 'authenticated');

-- Voice Notes (Private)
CREATE POLICY "voice_notes_select" ON storage.objects FOR SELECT USING (
    bucket_id = 'voice-notes' AND EXISTS (
        SELECT 1 FROM public.chats
        WHERE id::TEXT = (string_to_array(name, '/'))[1]
        AND (participant_1_id = public.get_current_user_unique_id() OR participant_2_id = public.get_current_user_unique_id())
    )
);
CREATE POLICY "voice_notes_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');
CREATE POLICY "voice_notes_update" ON storage.objects FOR UPDATE USING (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');
CREATE POLICY "voice_notes_delete" ON storage.objects FOR DELETE USING (bucket_id = 'voice-notes' AND auth.role() = 'authenticated');
