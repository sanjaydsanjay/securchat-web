-- ============================================================
-- SECURECHAT AI - Reports Table
-- ============================================================

CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_unique_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    reported_unique_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('spam', 'harassment', 'threats', 'fake_account', 'child_safety', 'other')),
    description TEXT,
    evidence_message_ids UUID[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    severity VARCHAR(20) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.reports IS 'User reports for platform violations with admin review workflow';
COMMENT ON COLUMN public.reports.evidence_message_ids IS 'Array of message IDs attached as evidence';
COMMENT ON COLUMN public.reports.severity IS 'Auto-assigned or admin-assigned severity level';
COMMENT ON COLUMN public.reports.status IS 'Current state in the review workflow';

CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_reporter ON public.reports(reporter_unique_id);
CREATE INDEX idx_reports_reported ON public.reports(reported_unique_id);
CREATE INDEX idx_reports_severity ON public.reports(severity);
CREATE INDEX idx_reports_created ON public.reports(created_at DESC);

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
