-- ============================================================
-- SECURECHAT AI - Payments Table
-- ============================================================

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_unique_id INTEGER NOT NULL REFERENCES public.users(unique_id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('basic', 'standard', 'premium', 'enterprise')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('upi', 'razorpay', 'card', 'netbanking')),
    screenshot_url TEXT,
    transaction_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    refund_reason TEXT,
    refund_amount DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS 'Payment transactions for premium subscriptions';
COMMENT ON COLUMN public.payments.razorpay_order_id IS 'Razorpay order ID for Phase 2 integration';
COMMENT ON COLUMN public.payments.screenshot_url IS 'Storage URL of UPI payment screenshot for Phase 1 manual verification';

CREATE INDEX idx_payments_user ON public.payments(user_unique_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created ON public.payments(created_at DESC);

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: verify_payment_and_upgrade()
-- Admin function to verify a UPI payment and credit the user.
-- ============================================================
CREATE OR REPLACE FUNCTION verify_payment_and_upgrade(
    payment_id UUID,
    admin_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pay_record RECORD;
    extra_messages INTEGER;
    new_quota INTEGER;
BEGIN
    -- Get payment record
    SELECT * INTO pay_record FROM public.payments WHERE id = payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Calculate additional messages based on plan
    extra_messages := CASE pay_record.plan
        WHEN 'basic' THEN 2500
        WHEN 'standard' THEN 5000
        WHEN 'premium' THEN 10000
        WHEN 'enterprise' THEN 100000
        ELSE 0
    END;

    -- Update payment status
    UPDATE public.payments
    SET status = 'verified',
        verified_by = admin_user_id,
        verified_at = NOW()
    WHERE id = payment_id;

    -- Update user quota and premium tier
    UPDATE public.users
    SET message_quota = message_quota + extra_messages,
        premium_tier = pay_record.plan,
        updated_at = NOW()
    WHERE unique_id = pay_record.user_unique_id;
END;
$$;
