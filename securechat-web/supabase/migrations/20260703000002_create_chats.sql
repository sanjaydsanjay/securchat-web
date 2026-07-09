-- ============================================================
-- SECURECHAT AI - Chats and Chat Members
-- ============================================================

-- ============================================================
-- TABLE: public.chats
-- Represents a conversation between two users.
-- chat_code is a sorted composite key (smallerId_largerId)
-- to guarantee uniqueness regardless of who initiates.
-- ============================================================
CREATE TABLE public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_code VARCHAR(13) UNIQUE NOT NULL,
    participant_1_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    participant_2_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    participant_1_settings JSONB DEFAULT '{"is_pinned": false, "is_muted": false, "is_archived": false, "custom_name": null, "auto_delete_hours": null}',
    participant_2_settings JSONB DEFAULT '{"is_pinned": false, "is_muted": false, "is_archived": false, "custom_name": null, "auto_delete_hours": null}',
    last_message_id UUID,
    last_message_preview TEXT,
    last_message_time TIMESTAMPTZ,
    unread_count_1 INTEGER DEFAULT 0,
    unread_count_2 INTEGER DEFAULT 0,
    is_e2e_enabled BOOLEAN DEFAULT FALSE,
    e2e_shared_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_participants CHECK (participant_1_id < participant_2_id)
);

COMMENT ON TABLE public.chats IS 'Two-user chat conversations with per-participant settings';
COMMENT ON COLUMN public.chats.chat_code IS 'Sorted composite key: smallerId_largerId (e.g., "123456_789012")';
COMMENT ON COLUMN public.chats.participant_1_settings IS 'JSON settings for first participant: pinned, muted, archived, custom name, auto-delete';
COMMENT ON COLUMN public.chats.participant_2_settings IS 'JSON settings for second participant';

-- ============================================================
-- TABLE: public.chat_members
-- Normalized member table for future group chat support.
-- Currently linked 1:1 with chats for two-person conversations.
-- ============================================================
CREATE TABLE public.chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    user_unique_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    UNIQUE(chat_id, user_unique_id)
);

COMMENT ON TABLE public.chat_members IS 'Chat membership, mapped for extensibility to group chats';

-- ============================================================
-- FUNCTION: create_chat()
-- Creates a new chat between two users.
-- Returns existing chat if one already exists (idempotent).
-- ============================================================
CREATE OR REPLACE FUNCTION create_chat(p1_unique_id INTEGER, p2_unique_id INTEGER)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    chat_uuid UUID;
    sorted_p1 INTEGER;
    sorted_p2 INTEGER;
    chat_code_str VARCHAR(13);
BEGIN
    -- Sort to ensure deterministic chat_code
    sorted_p1 := LEAST(p1_unique_id, p2_unique_id);
    sorted_p2 := GREATEST(p1_unique_id, p2_unique_id);
    chat_code_str := sorted_p1::TEXT || '_' || sorted_p2::TEXT;

    -- Attempt insert; if chat exists (conflict), do nothing
    INSERT INTO public.chats (chat_code, participant_1_id, participant_2_id)
    VALUES (chat_code_str, sorted_p1, sorted_p2)
    ON CONFLICT (chat_code) DO NOTHING
    RETURNING id INTO chat_uuid;

    -- If chat already existed, fetch existing id
    IF chat_uuid IS NULL THEN
        SELECT id INTO chat_uuid FROM public.chats WHERE chat_code = chat_code_str;
    END IF;

    -- Ensure both users are in chat_members
    INSERT INTO public.chat_members (chat_id, user_unique_id)
    VALUES (chat_uuid, sorted_p1), (chat_uuid, sorted_p2)
    ON CONFLICT (chat_id, user_unique_id) DO NOTHING;

    RETURN chat_uuid;
END;
$$;

COMMENT ON FUNCTION create_chat IS 'Creates or returns an existing chat between two users. Idempotent.';

-- ============================================================
-- FUNCTION: delete_chat()
-- Soft-deletes chat by archiving it for the calling user.
-- ============================================================
CREATE OR REPLACE FUNCTION archive_chat(chat_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_uid INTEGER;
BEGIN
    current_uid := get_current_user_unique_id();

    UPDATE public.chats
    SET participant_1_settings = jsonb_set(
            participant_1_settings,
            '{is_archived}',
            'true'::jsonb
        )
    WHERE id = chat_id AND participant_1_id = current_uid;

    UPDATE public.chats
    SET participant_2_settings = jsonb_set(
            participant_2_settings,
            '{is_archived}',
            'true'::jsonb
        )
    WHERE id = chat_id AND participant_2_id = current_uid;
END;
$$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_chats_participant_1 ON public.chats(participant_1_id);
CREATE INDEX idx_chats_participant_2 ON public.chats(participant_2_id);
CREATE INDEX idx_chats_last_message_time ON public.chats(last_message_time DESC);
CREATE INDEX idx_chats_code ON public.chats(chat_code);
CREATE INDEX idx_chat_members_chat_id ON public.chat_members(chat_id);
CREATE INDEX idx_chat_members_user ON public.chat_members(user_unique_id);

-- ============================================================
-- TRIGGER
-- ============================================================
CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON public.chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
