-- ============================================================
-- SECURECHAT AI - Message Quota Enforcement
-- BEFORE INSERT trigger on messages to enforce per-user quota.
-- ============================================================

CREATE OR REPLACE FUNCTION check_message_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_used INTEGER;
    current_quota INTEGER;
BEGIN
    SELECT messages_used, message_quota INTO current_used, current_quota
    FROM public.users
    WHERE unique_id = NEW.sender_unique_id;

    IF current_used >= current_quota AND current_quota >= 0 THEN
        RAISE EXCEPTION 'Message quota exhausted: % of % used', current_used, current_quota
            USING HINT = 'Upgrade your plan or wait for quota reset';
    END IF;

    UPDATE public.users
    SET messages_used = messages_used + 1
    WHERE unique_id = NEW.sender_unique_id;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_message_quota IS 'Enforces per-user message quota before insert and increments usage counter';

CREATE TRIGGER enforce_quota_before_insert
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION check_message_quota();
