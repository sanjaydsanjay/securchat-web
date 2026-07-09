-- ============================================================
-- MIGRATION: Create Web Push Subscriptions Table
-- ============================================================

CREATE TABLE public.web_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_unique_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL,
    UNIQUE(endpoint) -- endpoint is globally unique per browser installation
);

COMMENT ON TABLE public.web_push_subscriptions IS 'Stores standard Web Push API (VAPID) subscriptions for users browsers';
COMMENT ON COLUMN public.web_push_subscriptions.endpoint IS 'The push service URL provided by the browser';
COMMENT ON COLUMN public.web_push_subscriptions.p256dh IS 'The public key for ECDH encryption of push payloads';
COMMENT ON COLUMN public.web_push_subscriptions.auth IS 'The authentication secret for the push subscription';

-- Index for quick lookup when sending notifications
CREATE INDEX idx_web_push_user_id ON public.web_push_subscriptions(user_unique_id) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "subscriptions_select" ON public.web_push_subscriptions
    FOR SELECT USING (user_unique_id = public.get_current_user_unique_id());

CREATE POLICY "subscriptions_insert" ON public.web_push_subscriptions
    FOR INSERT WITH CHECK (user_unique_id = public.get_current_user_unique_id());

CREATE POLICY "subscriptions_delete" ON public.web_push_subscriptions
    FOR DELETE USING (user_unique_id = public.get_current_user_unique_id());

CREATE POLICY "subscriptions_update" ON public.web_push_subscriptions
    FOR UPDATE USING (user_unique_id = public.get_current_user_unique_id());
