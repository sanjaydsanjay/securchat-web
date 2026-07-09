-- ============================================================
-- SECURECHAT AI - 10-Day Free Trial & Premium System
-- Replaces message quota / AI hours with trial-based system.
-- ============================================================

-- ============================================================
-- 1. ADD NEW COLUMNS TO USERS TABLE
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_activated_at TIMESTAMPTZ;

-- ============================================================
-- 2. UPDATE PREMIUM_TIER CHECK CONSTRAINT
-- ============================================================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_premium_tier_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_premium_tier_check
  CHECK (premium_tier IN ('free', 'free_trial', 'trial_expired', 'basic', 'standard', 'pro'));

-- ============================================================
-- 3. MIGRATE EXISTING USERS
-- ============================================================
UPDATE public.users
SET
  premium_tier = CASE
    WHEN premium_tier IN ('basic', 'standard', 'premium', 'enterprise') THEN
      CASE
        WHEN premium_tier = 'basic' THEN 'basic'
        WHEN premium_tier = 'standard' THEN 'standard'
        WHEN premium_tier IN ('premium', 'enterprise') THEN 'pro'
      END
    ELSE 'free'
  END,
  is_premium = CASE WHEN premium_tier IN ('basic', 'standard', 'premium', 'enterprise') THEN TRUE ELSE FALSE END,
  is_trial_active = FALSE,
  plan_name = CASE
    WHEN premium_tier = 'basic' THEN 'PREMIUM BASIC'
    WHEN premium_tier = 'standard' THEN 'PREMIUM STANDARD'
    WHEN premium_tier IN ('premium', 'enterprise') THEN 'PREMIUM PRO'
    ELSE NULL
  END,
  payment_status = CASE WHEN premium_tier IN ('basic', 'standard', 'premium', 'enterprise') THEN 'success' ELSE 'none' END,
  premium_activated_at = CASE WHEN premium_tier IN ('basic', 'standard', 'premium', 'enterprise') THEN COALESCE(updated_at, NOW()) ELSE NULL END;

-- ============================================================
-- 4. UPDATE PAYMENTS TABLE
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS plan_name VARCHAR(50);

UPDATE public.payments p
SET user_id = u.id
FROM public.users u
WHERE p.user_unique_id = u.unique_id;

-- ============================================================
-- 5. RAZORPAY TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.razorpay_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id VARCHAR(255) NOT NULL UNIQUE,
    payment_id VARCHAR(255),
    signature VARCHAR(255),
    plan_name VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'verified')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.razorpay_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "razorpay_select_own" ON public.razorpay_transactions FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "razorpay_insert_own" ON public.razorpay_transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "razorpay_update_admin" ON public.razorpay_transactions FOR UPDATE USING (public.is_admin());
CREATE INDEX idx_razorpay_order ON public.razorpay_transactions(order_id);
CREATE INDEX idx_razorpay_user ON public.razorpay_transactions(user_id);

CREATE TRIGGER update_razorpay_transactions_updated_at
    BEFORE UPDATE ON public.razorpay_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. UPDATE handle_new_user() - SET 10-DAY FREE TRIAL
-- ============================================================
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
    new_unique_id := generate_unique_user_id();
    display_name_from_meta := NEW.raw_user_meta_data ->> 'display_name';
    email_prefix := SPLIT_PART(NEW.email, '@', 1);

    INSERT INTO public.users (
        auth_id, unique_id, display_name, email, avatar_url, bio,
        auto_delete_hours, theme_preference, accent_color,
        show_online_status, show_last_seen, show_read_receipts,
        premium_tier, is_trial_active, trial_start_date, trial_end_date, plan_name
    ) VALUES (
        NEW.id, new_unique_id,
        COALESCE(display_name_from_meta, email_prefix, 'User_' || new_unique_id),
        NEW.email,
        NULL, '', 24, 'system', '#128C7E', TRUE, 'everyone', TRUE,
        'free_trial', TRUE, NOW(), NOW() + INTERVAL '10 days', 'FREE TRIAL'
    );

    INSERT INTO public.user_settings (user_id)
    VALUES ((SELECT id FROM public.users WHERE auth_id = NEW.id));

    RETURN NEW;
END;
$$;

-- ============================================================
-- 7. FUNCTION: check_trial_status()
-- Server-side trial expiry check. Called on login.
-- Uses SERVER time NEVER client time.
-- ============================================================
CREATE OR REPLACE FUNCTION check_trial_status()
RETURNS TABLE (
  is_trial_active BOOLEAN,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  plan_name VARCHAR(50),
  days_remaining INTEGER,
  is_premium BOOLEAN,
  premium_tier VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE auth_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  -- Expire trial using SERVER time
  IF user_record.is_trial_active AND user_record.trial_end_date IS NOT NULL AND NOW() > user_record.trial_end_date THEN
    UPDATE public.users
    SET is_trial_active = FALSE,
        plan_name = 'TRIAL EXPIRED',
        updated_at = NOW()
    WHERE auth_id = auth.uid()
    RETURNING * INTO user_record;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(user_record.is_trial_active, FALSE),
    user_record.trial_start_date,
    user_record.trial_end_date,
    COALESCE(user_record.plan_name, 'FREE'),
    CASE
      WHEN user_record.is_premium THEN 0
      WHEN user_record.is_trial_active AND user_record.trial_end_date IS NOT NULL
        THEN GREATEST(0, (EXTRACT(EPOCH FROM user_record.trial_end_date) - EXTRACT(EPOCH FROM NOW()))::INTEGER / 86400)
      ELSE 0
    END::INTEGER,
    COALESCE(user_record.is_premium, FALSE),
    COALESCE(user_record.premium_tier, 'free');
END;
$$;

-- ============================================================
-- 8. FUNCTION: check_and_expire_trials(p_user_id)
-- Called from frontend to check/expire trial for a specific user.
-- ============================================================
CREATE OR REPLACE FUNCTION check_and_expire_trials(p_user_id UUID)
RETURNS TABLE (
  is_trial_active BOOLEAN,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  plan_name VARCHAR(50),
  days_remaining INTEGER,
  is_premium BOOLEAN,
  premium_tier VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE auth_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  IF user_record.is_trial_active AND user_record.trial_end_date IS NOT NULL AND NOW() > user_record.trial_end_date THEN
    UPDATE public.users
    SET is_trial_active = FALSE,
        plan_name = 'TRIAL EXPIRED',
        updated_at = NOW()
    WHERE auth_id = p_user_id
    RETURNING * INTO user_record;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(user_record.is_trial_active, FALSE),
    user_record.trial_start_date,
    user_record.trial_end_date,
    COALESCE(user_record.plan_name, 'FREE'),
    CASE
      WHEN user_record.is_premium THEN 0
      WHEN user_record.is_trial_active AND user_record.trial_end_date IS NOT NULL
        THEN GREATEST(0, (EXTRACT(EPOCH FROM user_record.trial_end_date) - EXTRACT(EPOCH FROM NOW()))::INTEGER / 86400)
      ELSE 0
    END::INTEGER,
    COALESCE(user_record.is_premium, FALSE),
    COALESCE(user_record.premium_tier, 'free');
END;
$$;

-- ============================================================
-- 9. FUNCTION: activate_premium()
-- Backend-only: activates premium after payment verification.
-- ============================================================
CREATE OR REPLACE FUNCTION activate_premium(
  p_plan_name VARCHAR(50),
  p_payment_reference TEXT DEFAULT NULL,
  p_payment_method VARCHAR(20) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tier VARCHAR(20);
BEGIN
  new_tier := CASE
    WHEN p_plan_name IN ('PREMIUM BASIC', 'Premium Basic') THEN 'basic'
    WHEN p_plan_name IN ('PREMIUM STANDARD', 'Premium Standard') THEN 'standard'
    WHEN p_plan_name IN ('PREMIUM PRO', 'Premium Pro') THEN 'pro'
    ELSE 'free'
  END;

  UPDATE public.users
  SET is_premium = TRUE,
      is_trial_active = FALSE,
      premium_tier = new_tier,
      plan_name = p_plan_name,
      payment_status = 'success',
      payment_reference = COALESCE(p_payment_reference, payment_reference),
      payment_method = COALESCE(p_payment_method, payment_method),
      payment_date = NOW(),
      premium_activated_at = NOW(),
      updated_at = NOW()
  WHERE auth_id = auth.uid();
END;
$$;

-- ============================================================
-- 10. FUNCTION: admin_approve_payment()
-- Admin approves manual payment and activates premium.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_approve_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pay_record RECORD;
    new_tier VARCHAR(20);
    plan_display_name VARCHAR(50);
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    SELECT * INTO pay_record FROM public.payments WHERE id = p_payment_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
    IF pay_record.status = 'verified' THEN RAISE EXCEPTION 'Payment already verified'; END IF;

    plan_display_name := pay_record.plan_name;
    new_tier := CASE
      WHEN plan_display_name ILIKE '%BASIC%' THEN 'basic'
      WHEN plan_display_name ILIKE '%STANDARD%' THEN 'standard'
      WHEN plan_display_name ILIKE '%PRO%' THEN 'pro'
      ELSE 'free'
    END;

    UPDATE public.payments
    SET status = 'verified', verified_by = auth.uid(), verified_at = NOW()
    WHERE id = p_payment_id;

    UPDATE public.users
    SET is_premium = TRUE,
        is_trial_active = FALSE,
        premium_tier = new_tier,
        plan_name = plan_display_name,
        payment_status = 'success',
        payment_reference = COALESCE(pay_record.transaction_id, pay_record.razorpay_payment_id),
        payment_method = pay_record.payment_method,
        payment_date = NOW(),
        premium_activated_at = NOW(),
        updated_at = NOW()
    WHERE id = pay_record.user_id;

    INSERT INTO public.audit_logs (actor_id, actor_unique_id, action, resource_type, resource_id, new_values, description)
    VALUES (auth.uid(), public.get_current_user_unique_id(), 'payment.approved', 'payment', p_payment_id::TEXT,
      jsonb_build_object('plan', new_tier, 'plan_name', plan_display_name), 'Admin approved payment and activated premium');
END;
$$;

-- ============================================================
-- 11. FUNCTION: admin_reject_payment()
-- Admin rejects manual payment.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_reject_payment(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    UPDATE public.payments
    SET status = 'rejected', verified_by = auth.uid(), verified_at = NOW()
    WHERE id = p_payment_id;

    INSERT INTO public.audit_logs (actor_id, actor_unique_id, action, resource_type, resource_id, description)
    VALUES (auth.uid(), public.get_current_user_unique_id(), 'payment.rejected', 'payment', p_payment_id::TEXT,
      'Admin rejected payment');
END;
$$;

-- ============================================================
-- 12. REMOVE MESSAGE QUOTA ENFORCEMENT (replaced by trial)
-- ============================================================
DROP TRIGGER IF EXISTS enforce_quota_before_insert ON public.messages;
DROP FUNCTION IF EXISTS check_message_quota();

-- ============================================================
-- 13. CLEAR MESSAGE DATA (as requested)
-- ============================================================
TRUNCATE TABLE public.messages CASCADE;
UPDATE public.chats SET last_message_id = NULL, last_message_preview = NULL, last_message_time = NULL;
