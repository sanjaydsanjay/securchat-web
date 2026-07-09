-- ============================================================
-- SECURECHAT AI - Audit Logs Table
-- ============================================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_unique_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail for security-sensitive actions';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed (e.g., user.login, message.delete, admin.ban)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource affected (user, message, chat, payment, report)';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Snapshot of values before the action';
COMMENT ON COLUMN public.audit_logs.new_values IS 'Snapshot of values after the action';

CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_actor_uid ON public.audit_logs(actor_unique_id);
CREATE INDEX idx_audit_action ON public.audit_logs(action);
CREATE INDEX idx_audit_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- FUNCTION: log_audit_event()
-- Helper to insert audit log entries from Edge Functions / RPC.
-- ============================================================
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT '{}',
    p_new_values JSONB DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id UUID;
    current_uid INTEGER;
BEGIN
    current_uid := get_current_user_unique_id();

    INSERT INTO public.audit_logs (
        actor_id,
        actor_unique_id,
        action,
        resource_type,
        resource_id,
        description,
        old_values,
        new_values,
        metadata
    ) VALUES (
        auth.uid(),
        current_uid,
        p_action,
        p_resource_type,
        p_resource_id,
        p_description,
        p_old_values,
        p_new_values,
        p_metadata
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$;

COMMENT ON FUNCTION log_audit_event IS 'Provides a simple interface for Edge Functions to write audit logs';

-- ============================================================
-- TRIGGER: audit_user_changes()
-- Automatically logs sensitive user profile changes.
-- ============================================================
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.display_name IS DISTINCT FROM NEW.display_name
       OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
       OR OLD.premium_tier IS DISTINCT FROM NEW.premium_tier
       OR OLD.is_banned IS DISTINCT FROM NEW.is_banned THEN

        INSERT INTO public.audit_logs (
            actor_id, actor_unique_id, action, resource_type,
            resource_id, description,
            old_values, new_values
        ) VALUES (
            auth.uid(), OLD.unique_id, 'user.updated', 'user',
            OLD.id,
            'Profile updated',
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_profile_update
    AFTER UPDATE ON public.users
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION audit_user_changes();
