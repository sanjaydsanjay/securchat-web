-- ============================================================
-- SECURECHAT AI - Messages Table
-- ============================================================

-- ============================================================
-- TABLE: public.messages
-- Stores all chat messages with full metadata for AI analysis,
-- read receipts, reactions, editing history, and expiry.
-- ============================================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_unique_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    receiver_unique_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'document', 'voice', 'location', 'system')),
    media_url TEXT,
    media_metadata JSONB DEFAULT '{}',
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    edit_history JSONB DEFAULT '[]',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_for INTEGER[] DEFAULT '{}',
    deleted_at TIMESTAMPTZ,
    read_by JSONB DEFAULT '{}',
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
    is_forwarded BOOLEAN DEFAULT FALSE,
    original_sender_id INTEGER,
    reactions JSONB DEFAULT '{}',
    starred_by INTEGER[] DEFAULT '{}',
    ai_analyzed BOOLEAN DEFAULT FALSE,
    ai_threat_level VARCHAR(20) DEFAULT 'none' CHECK (ai_threat_level IN ('none', 'low', 'medium', 'high', 'critical')),
    ai_categories TEXT[] DEFAULT '{}',
    ai_confidence DECIMAL(3,2),
    e2e_encrypted BOOLEAN DEFAULT FALSE,
    e2e_nonce TEXT,
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

COMMENT ON TABLE public.messages IS 'All chat messages with delivery tracking, AI analysis, reactions, and auto-expiry';
COMMENT ON COLUMN public.messages.read_by IS 'Map of receiver unique_id to read timestamp: {"583620": "2026-07-03T10:30:00Z"}';
COMMENT ON COLUMN public.messages.reactions IS 'Map of emoji type to array of unique_ids who reacted';
COMMENT ON COLUMN public.messages.edit_history IS 'Array of {content, edited_at} objects for edit tracking';
COMMENT ON COLUMN public.messages.deleted_for IS 'Array of unique_ids who deleted this message for themselves';
COMMENT ON COLUMN public.messages.expires_at IS 'Auto-delete timestamp; NULL means never expires';
COMMENT ON COLUMN public.messages.starred_by IS 'Array of unique_ids who starred this message';

-- ============================================================
-- FUNCTION: toggle_reaction()
-- Adds or removes a reaction from a message.
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_reaction(msg_id UUID, reaction_key VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid INTEGER;
    existing_reactions JSONB;
    current_users INTEGER[];
    updated_users INTEGER[];
BEGIN
    current_uid := get_current_user_unique_id();

    SELECT reactions INTO existing_reactions
    FROM public.messages WHERE id = msg_id;

    IF existing_reactions ? reaction_key THEN
        current_users := ARRAY(
            SELECT jsonb_array_elements_text(existing_reactions->reaction_key)::INTEGER
        );
        IF current_uid = ANY(current_users) THEN
            -- Remove user's reaction
            updated_users := array_remove(current_users, current_uid);
            IF array_length(updated_users, 1) IS NULL THEN
                existing_reactions := existing_reactions - reaction_key;
            ELSE
                existing_reactions := jsonb_set(
                    existing_reactions,
                    ARRAY[reaction_key],
                    to_jsonb(updated_users)
                );
            END IF;
        ELSE
            -- Add user's reaction
            updated_users := array_append(current_users, current_uid);
            existing_reactions := jsonb_set(
                existing_reactions,
                ARRAY[reaction_key],
                to_jsonb(updated_users)
            );
        END IF;
    ELSE
        existing_reactions := jsonb_set(
            existing_reactions,
            ARRAY[reaction_key],
            to_jsonb(ARRAY[current_uid])
        );
    END IF;

    UPDATE public.messages SET reactions = existing_reactions WHERE id = msg_id;
END;
$$;

-- ============================================================
-- FUNCTION: toggle_star_message()
-- Stars or un-stars a message for the current user.
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_star_message(msg_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid INTEGER;
    current_stars INTEGER[];
BEGIN
    current_uid := get_current_user_unique_id();

    SELECT starred_by INTO current_stars
    FROM public.messages WHERE id = msg_id;

    IF current_uid = ANY(current_stars) THEN
        UPDATE public.messages
        SET starred_by = array_remove(starred_by, current_uid)
        WHERE id = msg_id;
    ELSE
        UPDATE public.messages
        SET starred_by = array_append(starred_by, current_uid)
        WHERE id = msg_id;
    END IF;
END;
$$;

-- ============================================================
-- FUNCTION: get_starred_messages()
-- Returns all messages starred by the current user.
-- ============================================================
CREATE OR REPLACE FUNCTION get_starred_messages()
RETURNS SETOF public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid INTEGER;
BEGIN
    current_uid := get_current_user_unique_id();
    RETURN QUERY
    SELECT * FROM public.messages
    WHERE current_uid = ANY(starred_by)
    ORDER BY created_at DESC;
END;
$$;

-- ============================================================
-- FUNCTION: mark_messages_read()
-- Marks an array of messages as read by the current user.
-- ============================================================
CREATE OR REPLACE FUNCTION mark_messages_read(msg_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid INTEGER;
    read_entry JSONB;
BEGIN
    current_uid := get_current_user_unique_id();
    read_entry := jsonb_build_object(current_uid::TEXT, NOW()::TEXT);

    UPDATE public.messages
    SET read_by = read_by || read_entry
    WHERE id = ANY(msg_ids)
    AND NOT read_by ? current_uid::TEXT;
END;
$$;

-- ============================================================
-- FUNCTION: append_edit_history()
-- Appends an edit entry to the message's edit_history.
-- ============================================================
CREATE OR REPLACE FUNCTION append_edit_history(msg_id UUID, new_content TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_history JSONB;
    edit_entry JSONB;
BEGIN
    SELECT edit_history INTO current_history
    FROM public.messages WHERE id = msg_id;

    edit_entry := jsonb_build_object(
        'content', new_content,
        'edited_at', NOW()::TEXT
    );

    current_history := current_history || jsonb_build_array(edit_entry);

    RETURN current_history;
END;
$$;

-- ============================================================
-- FUNCTION: add_self_to_deleted_for()
-- Adds current user's unique_id to deleted_for array.
-- ============================================================
CREATE OR REPLACE FUNCTION add_self_to_deleted_for(msg_id UUID)
RETURNS INTEGER[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid INTEGER;
    current_deleted INTEGER[];
BEGIN
    current_uid := get_current_user_unique_id();

    SELECT deleted_for INTO current_deleted
    FROM public.messages WHERE id = msg_id;

    IF NOT (current_uid = ANY(current_deleted)) THEN
        current_deleted := array_append(current_deleted, current_uid);
    END IF;

    RETURN current_deleted;
END;
$$;

-- ============================================================
-- FUNCTION: delete_expired_messages()
-- Called by pg_cron to purge messages past their expiry.
-- Also removes associated media from storage.
-- ============================================================
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.messages
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_deleted = FALSE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION delete_expired_messages IS 'Purges expired messages. Run via pg_cron every hour.';

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_chat_created ON public.messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_expires ON public.messages(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_messages_sender ON public.messages(sender_unique_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_unique_id);
CREATE INDEX idx_messages_ai ON public.messages(ai_threat_level) WHERE ai_threat_level != 'none';
CREATE INDEX idx_messages_starred ON public.messages USING GIN(starred_by);
CREATE INDEX idx_messages_reactions ON public.messages USING GIN(reactions);
CREATE INDEX idx_messages_content_search ON public.messages USING GIN(to_tsvector('english', content));

COMMENT ON INDEX idx_messages_content_search IS 'GIN index for full-text search on message content';
COMMENT ON INDEX idx_messages_expires IS 'Index for efficient expiry queries in auto-delete cron job';
