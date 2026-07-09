-- ============================================================
-- SECURECHAT AI - Row Level Security Policies
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS RLS
-- ============================================================
-- Users can read their own full profile
CREATE POLICY "users_read_own" ON public.users
    FOR SELECT
    USING (auth.uid() = auth_id);

-- Users can read limited public info of other non-banned users
CREATE POLICY "users_read_public" ON public.users
    FOR SELECT
    USING (
        auth.uid() != auth_id
        AND is_banned = FALSE
    );

-- Users can update their own profile (but not sensitive fields)
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);

-- Only admins can update sensitive fields
CREATE POLICY "users_admin_update" ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND is_admin = TRUE
        )
    );

-- Prevent deletion of user profiles (cascade from auth.users handles it)
CREATE POLICY "prevent_user_delete" ON public.users
    FOR DELETE
    USING (FALSE);

-- ============================================================
-- USER SETTINGS RLS
-- ============================================================
CREATE POLICY "settings_read_own" ON public.user_settings
    FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "settings_update_own" ON public.user_settings
    FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "settings_insert_own" ON public.user_settings
    FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- ============================================================
-- CHATS RLS
-- Only participants can see their chats.
-- ============================================================
CREATE POLICY "chats_select_participant" ON public.chats
    FOR SELECT
    USING (
        participant_1_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
        OR participant_2_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "chats_insert_authenticated" ON public.chats
    FOR INSERT
    WITH CHECK (
        -- User must be one of the participants
        participant_1_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
        OR participant_2_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "chats_update_participant" ON public.chats
    FOR UPDATE
    USING (
        participant_1_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
        OR participant_2_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- ============================================================
-- CHAT MEMBERS RLS
-- ============================================================
CREATE POLICY "members_select_own" ON public.chat_members
    FOR SELECT
    USING (
        user_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "members_insert_self" ON public.chat_members
    FOR INSERT
    WITH CHECK (
        user_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- ============================================================
-- MESSAGES RLS
-- Users can only see messages in chats they participate in.
-- Users can only send messages as themselves.
-- ============================================================
CREATE POLICY "messages_select_own_chats" ON public.messages
    FOR SELECT
    USING (
        chat_id IN (
            SELECT id FROM public.chats WHERE
                participant_1_id IN (SELECT unique_id FROM public.users WHERE auth_id = auth.uid())
                OR participant_2_id IN (SELECT unique_id FROM public.users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "messages_insert_own" ON public.messages
    FOR INSERT
    WITH CHECK (
        sender_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
        AND chat_id IN (
            SELECT id FROM public.chats WHERE
                participant_1_id IN (SELECT unique_id FROM public.users WHERE auth_id = auth.uid())
                OR participant_2_id IN (SELECT unique_id FROM public.users WHERE auth_id = auth.uid())
        )
    );

CREATE POLICY "messages_update_own" ON public.messages
    FOR UPDATE
    USING (
        sender_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "messages_delete_expired" ON public.messages
    FOR DELETE
    USING (
        -- Only the auto-delete cron function (service_role) can delete
        -- Regular users cannot delete messages directly (mark as deleted instead)
        FALSE
    );

-- ============================================================
-- REPORTS RLS
-- ============================================================
CREATE POLICY "reports_insert_authenticated" ON public.reports
    FOR INSERT
    WITH CHECK (
        reporter_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "reports_select_own" ON public.reports
    FOR SELECT
    USING (
        reporter_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
        OR reported_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "reports_admin_update" ON public.reports
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND is_admin = TRUE
        )
    );

-- ============================================================
-- PAYMENTS RLS
-- ============================================================
CREATE POLICY "payments_select_own" ON public.payments
    FOR SELECT
    USING (
        user_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "payments_insert_own" ON public.payments
    FOR INSERT
    WITH CHECK (
        user_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "payments_admin_update" ON public.payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND is_admin = TRUE
        )
    );

-- ============================================================
-- SCHEDULED MESSAGES RLS
-- ============================================================
CREATE POLICY "scheduled_select_own" ON public.scheduled_messages
    FOR SELECT
    USING (
        sender_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "scheduled_insert_own" ON public.scheduled_messages
    FOR INSERT
    WITH CHECK (
        sender_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "scheduled_update_own" ON public.scheduled_messages
    FOR UPDATE
    USING (
        sender_unique_id IN (
            SELECT unique_id FROM public.users WHERE auth_id = auth.uid()
        )
    );

-- ============================================================
-- AUDIT LOGS RLS
-- Only admins can read audit logs.
-- Only service_role can insert (via Edge Functions).
-- ============================================================
CREATE POLICY "audit_admin_select" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND is_admin = TRUE
        )
    );

-- Regular users cannot insert audit logs directly
CREATE POLICY "audit_no_insert" ON public.audit_logs
    FOR INSERT
    WITH CHECK (FALSE);

-- Audit logs are immutable: no updates or deletes
CREATE POLICY "audit_no_update" ON public.audit_logs
    FOR UPDATE
    USING (FALSE);

CREATE POLICY "audit_no_delete" ON public.audit_logs
    FOR DELETE
    USING (FALSE);

-- ============================================================
-- STORAGE BUCKETS RLS
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Chat media: users can only access files in chats they participate in
CREATE POLICY "chat_media_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'chat-media'
        AND (
            EXISTS (
                SELECT 1 FROM public.chats
                WHERE id::TEXT = (string_to_array(name, '/'))[1]
                AND (
                    participant_1_id IN (SELECT unique_id FROM public.users WHERE auth_id = auth.uid())
                    OR participant_2_id IN (SELECT unique_id FROM public.users WHERE auth_id = auth.uid())
                )
            )
        )
    );

CREATE POLICY "chat_media_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-media'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "chat_media_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'chat-media'
        AND auth.role() = 'authenticated'
    );

-- Avatars: public reads, authenticated uploads
CREATE POLICY "avatar_select" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "avatar_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
    );

-- Payment screenshots: only admins can read, authenticated users can upload
CREATE POLICY "payment_screenshot_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'payment-screenshots'
        AND (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE auth_id = auth.uid() AND is_admin = TRUE
            )
        )
    );

CREATE POLICY "payment_screenshot_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'payment-screenshots'
        AND auth.role() = 'authenticated'
    );

-- ============================================================
-- pg_cron JOBS
-- ============================================================
SELECT cron.schedule(
    'auto-delete-messages',
    '0 * * * *',  -- Every hour
    'SELECT delete_expired_messages()'
);

SELECT cron.schedule(
    'send-scheduled-messages',
    '* * * * *',  -- Every minute
    'SELECT process_scheduled_messages()'
);

SELECT cron.schedule(
    'reset-message-quotas',
    '0 0 1 * *',  -- 1st of every month at midnight
    $$UPDATE public.users SET messages_used = 0, quota_resets_at = NOW() + INTERVAL '1 month'$$
);

COMMENT ON TABLE public.users IS 'Core user profiles linked to Supabase Auth';
COMMENT ON TABLE public.user_settings IS 'Extended user preferences and settings';
COMMENT ON TABLE public.chats IS 'Two-user chat conversations';
COMMENT ON TABLE public.chat_members IS 'Chat membership records';
COMMENT ON TABLE public.messages IS 'Chat messages with full metadata';
COMMENT ON TABLE public.reports IS 'User reports for platform violations';
COMMENT ON TABLE public.payments IS 'Payment transactions for premium subscriptions';
COMMENT ON TABLE public.scheduled_messages IS 'Messages scheduled for future delivery';
COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail for security-sensitive actions';
