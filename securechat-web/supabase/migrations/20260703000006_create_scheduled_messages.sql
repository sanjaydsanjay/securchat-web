-- ============================================================
-- SECURECHAT AI - Scheduled Messages Table
-- ============================================================

CREATE TABLE public.scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_unique_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    media_url TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.scheduled_messages IS 'Messages scheduled for future delivery';
COMMENT ON COLUMN public.scheduled_messages.scheduled_for IS 'Timestamp when the message should be sent';
COMMENT ON COLUMN public.scheduled_messages.status IS 'pending=waiting, sent=delivered, cancelled=user cancelled, failed=send error';

CREATE INDEX idx_scheduled_status ON public.scheduled_messages(status) WHERE status = 'pending';
CREATE INDEX idx_scheduled_time ON public.scheduled_messages(scheduled_for);
CREATE INDEX idx_scheduled_chat ON public.scheduled_messages(chat_id);

-- ============================================================
-- FUNCTION: process_scheduled_messages()
-- Called by pg_cron every minute. Sends all due scheduled messages.
-- ============================================================
CREATE OR REPLACE FUNCTION process_scheduled_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    msg_record RECORD;
    sent_count INTEGER := 0;
    chat_record RECORD;
    receiver_id INTEGER;
BEGIN
    FOR msg_record IN
        SELECT * FROM public.scheduled_messages
        WHERE status = 'pending'
        AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
    LOOP
        BEGIN
            -- Determine receiver
            SELECT * INTO chat_record FROM public.chats WHERE id = msg_record.chat_id;
            IF chat_record.participant_1_id = msg_record.sender_unique_id THEN
                receiver_id := chat_record.participant_2_id;
            ELSE
                receiver_id := chat_record.participant_1_id;
            END IF;

            -- Insert the message
            INSERT INTO public.messages (
                chat_id, sender_unique_id, receiver_unique_id,
                content, content_type, media_url
            ) VALUES (
                msg_record.chat_id, msg_record.sender_unique_id,
                receiver_id, msg_record.content, msg_record.content_type,
                msg_record.media_url
            );

            -- Update scheduled message status
            UPDATE public.scheduled_messages
            SET status = 'sent'
            WHERE id = msg_record.id;

            sent_count := sent_count + 1;
        EXCEPTION WHEN OTHERS THEN
            UPDATE public.scheduled_messages
            SET status = 'failed',
                error_message = SQLERRM
            WHERE id = msg_record.id;
        END;
    END LOOP;

    RETURN sent_count;
END;
$$;

COMMENT ON FUNCTION process_scheduled_messages IS 'Sends all scheduled messages that are due. Run by pg_cron every minute.';
