-- ============================================================
-- MIGRATION: Add voice-notes bucket and storage policies
-- ============================================================

-- Voice notes bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Allow chat participants to read voice notes from their chats
CREATE POLICY "voice_notes_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'voice-notes'
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

-- Allow authenticated users to upload voice notes
CREATE POLICY "voice_notes_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'voice-notes'
        AND auth.role() = 'authenticated'
    );

-- Allow senders to delete their own voice notes
CREATE POLICY "voice_notes_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'voice-notes'
        AND auth.role() = 'authenticated'
    );

-- Allow authenticated users to update avatar (for replace/upsert)
CREATE POLICY "avatar_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
    );

COMMENT ON POLICY "voice_notes_select" ON storage.objects IS 'Users can read voice notes from chats they participate in';
COMMENT ON POLICY "voice_notes_insert" ON storage.objects IS 'Authenticated users can upload voice notes';
COMMENT ON POLICY "voice_notes_delete" ON storage.objects IS 'Authenticated users can delete voice notes';
COMMENT ON POLICY "avatar_update" ON storage.objects IS 'Authenticated users can update/replace avatars';
