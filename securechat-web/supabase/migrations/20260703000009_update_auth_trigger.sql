-- ============================================================
-- SECURECHAT AI - Phase 2: Improved Auth Trigger
-- Updated handle_new_user() to read display_name from metadata.
-- ============================================================

-- Replace the existing handler to read display_name from user_metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_unique_id INTEGER;
    display_name_from_meta VARCHAR(50);
    email_prefix VARCHAR(50);
BEGIN
    -- Generate unique 6-digit ID
    new_unique_id := generate_unique_user_id();

    -- Derive display name: metadata > email prefix > fallback
    display_name_from_meta := NEW.raw_user_meta_data ->> 'display_name';
    email_prefix := SPLIT_PART(NEW.email, '@', 1);

    INSERT INTO public.users (
        auth_id,
        unique_id,
        display_name,
        email,
        avatar_url,
        bio,
        auto_delete_hours,
        theme_preference,
        accent_color,
        show_online_status,
        show_last_seen,
        show_read_receipts
    ) VALUES (
        NEW.id,
        new_unique_id,
        COALESCE(display_name_from_meta, email_prefix, 'User_' || new_unique_id),
        NEW.email,
        NULL,
        '',
        24,
        'system',
        '#128C7E',
        TRUE,
        'everyone',
        TRUE
    );

    -- Create default settings
    INSERT INTO public.user_settings (user_id)
    VALUES (
        (SELECT id FROM public.users WHERE auth_id = NEW.id)
    );

    RETURN NEW;
END;
$$;

-- ============================================================
-- FUNCTION: update_display_name()
-- Allows users to update their display name after signup.
-- Called from the frontend on first login or profile edit.
-- ============================================================
CREATE OR REPLACE FUNCTION update_display_name(new_name VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET display_name = new_name,
        updated_at = NOW()
    WHERE auth_id = auth.uid()
    AND new_name IS NOT NULL
    AND length(new_name) BETWEEN 1 AND 50;
END;
$$;

-- ============================================================
-- FUNCTION: delete_user_account()
-- Securely deletes the user's account and all associated data.
-- Called from Edge Function or client-side RPC.
-- ============================================================
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid UUID;
BEGIN
    uid := auth.uid();
    IF uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Log deletion
    INSERT INTO public.audit_logs (actor_id, actor_unique_id, action, resource_type, description)
    VALUES (uid, get_current_user_unique_id(), 'account.deleted', 'user', 'User self-deleted account');

    -- Delete from auth.users cascades to public.users
    DELETE FROM auth.users WHERE id = uid;
END;
$$;

-- ============================================================
-- FUNCTION: resend_verification_email()
-- Allows the user to request a new verification email.
-- ============================================================
CREATE OR REPLACE FUNCTION resend_verification_email(target_email VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM auth.users WHERE email = target_email;
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Cannot call auth functions directly from PL/pgSQL
    -- This is handled client-side via supabase.auth.resend()
    RAISE NOTICE 'Verification email resend must be triggered client-side';
END;
$$;
