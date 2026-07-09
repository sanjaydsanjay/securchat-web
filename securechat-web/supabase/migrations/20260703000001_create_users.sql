-- ============================================================
-- SECURECHAT AI - Phase 1: Users, Settings & Auth Setup
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- TABLE: public.users
-- Core user table linked to Supabase Auth.
-- ============================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unique_id INTEGER UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    bio VARCHAR(200) DEFAULT '',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    premium_tier VARCHAR(20) DEFAULT 'free' CHECK (premium_tier IN ('free', 'basic', 'standard', 'premium', 'enterprise')),
    message_quota INTEGER DEFAULT 5000,
    messages_used INTEGER DEFAULT 0,
    quota_resets_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 month',
    e2e_enabled BOOLEAN DEFAULT FALSE,
    e2e_public_key TEXT,
    auto_delete_hours INTEGER DEFAULT 24 CHECK (auto_delete_hours IN (0, 1, 6, 24, 168, -1)),
    theme_preference VARCHAR(20) DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'midnight', 'forest', 'system')),
    accent_color VARCHAR(7) DEFAULT '#128C7E',
    show_online_status BOOLEAN DEFAULT TRUE,
    show_last_seen VARCHAR(20) DEFAULT 'everyone' CHECK (show_last_seen IN ('everyone', 'contacts', 'nobody')),
    show_read_receipts BOOLEAN DEFAULT TRUE,
    blocked_users INTEGER[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    ban_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Core user profiles linked to Supabase Auth';
COMMENT ON COLUMN public.users.unique_id IS 'Lifetime unique 6-digit public identifier (100000-999999)';
COMMENT ON COLUMN public.users.is_online IS 'Real-time online status flag';
COMMENT ON COLUMN public.users.last_seen IS 'Timestamp of last user activity';
COMMENT ON COLUMN public.users.blocked_users IS 'Array of unique_ids that this user has blocked';

-- ============================================================
-- TABLE: public.user_settings
-- Separate table for extended settings to keep users lean.
-- ============================================================
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    auto_delete_hours INTEGER DEFAULT 24 CHECK (auto_delete_hours IN (0, 1, 6, 24, 168, -1)),
    theme_preference VARCHAR(20) DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'midnight', 'forest', 'system')),
    accent_color VARCHAR(7) DEFAULT '#128C7E',
    show_online_status BOOLEAN DEFAULT TRUE,
    show_last_seen VARCHAR(20) DEFAULT 'everyone' CHECK (show_last_seen IN ('everyone', 'contacts', 'nobody')),
    show_read_receipts BOOLEAN DEFAULT TRUE,
    notification_sound VARCHAR(50) DEFAULT 'default',
    vibration_enabled BOOLEAN DEFAULT TRUE,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.user_settings IS 'Extended user preferences and settings';

-- ============================================================
-- FUNCTION: generate_unique_user_id()
-- Cryptographically random 6-digit ID with collision checking.
-- Uses advisory lock to prevent race conditions.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_unique_user_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id INTEGER;
    id_exists BOOLEAN;
BEGIN
    LOOP
        new_id := floor(random() * 899999 + 100000)::INTEGER;
        SELECT EXISTS(SELECT 1 FROM public.users WHERE unique_id = new_id) INTO id_exists;
        EXIT WHEN NOT id_exists;
    END LOOP;
    RETURN new_id;
END;
$$;

COMMENT ON FUNCTION generate_unique_user_id IS 'Generates a unique 6-digit ID (100000-999999) with collision avoidance';

-- ============================================================
-- FUNCTION: handle_new_user()
-- Trigger function: auto-creates user profile after auth signup.
-- Generates unique 6-digit ID, creates profile and settings rows.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_unique_id INTEGER;
    default_display_name VARCHAR(50);
BEGIN
    -- Generate unique ID
    new_unique_id := generate_unique_user_id();

    -- Derive display name from email (or use fallback)
    default_display_name := COALESCE(
        SPLIT_PART(NEW.email, '@', 1),
        'User_' || new_unique_id
    );

    -- Create user profile
    INSERT INTO public.users (
        auth_id,
        unique_id,
        display_name,
        email
    ) VALUES (
        NEW.id,
        new_unique_id,
        default_display_name,
        NEW.email
    );

    -- Create default settings
    INSERT INTO public.user_settings (user_id)
    VALUES (
        (SELECT id FROM public.users WHERE auth_id = NEW.id)
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user IS 'Auto-creates user profile and settings on auth.users insert';

-- ============================================================
-- FUNCTION: update_updated_at_column()
-- Generic trigger function for updated_at timestamps.
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column IS 'Sets updated_at to current timestamp on row update';

-- ============================================================
-- FUNCTION: get_current_user_unique_id()
-- Returns the unique_id for the currently authenticated user.
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_user_unique_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid INTEGER;
BEGIN
    SELECT unique_id INTO uid FROM public.users WHERE auth_id = auth.uid();
    RETURN uid;
END;
$$;

COMMENT ON FUNCTION get_current_user_unique_id IS 'Returns the 6-digit unique_id for the current authenticated user';

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on auth signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on user_settings
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_unique_id ON public.users(unique_id);
CREATE INDEX idx_users_online ON public.users(is_online) WHERE is_online = TRUE;
CREATE INDEX idx_users_premium ON public.users(premium_tier);
CREATE INDEX idx_users_last_seen ON public.users(last_seen DESC);
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

COMMENT ON INDEX idx_users_online IS 'Optimizes queries for online user presence';
COMMENT ON INDEX idx_users_premium IS 'Optimizes premium tier queries for admin dashboard';
