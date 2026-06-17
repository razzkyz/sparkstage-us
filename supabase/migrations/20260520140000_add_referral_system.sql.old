-- Add Referral System for SPARK CLUB
-- Purpose: Allow customers to generate referral codes and earn bonus loyalty points
-- Date: May 20, 2026

-- Create loyalty_points_transactions table if not exists
-- This table tracks all loyalty point transactions (referral bonuses, admin awards, etc.)
CREATE TABLE IF NOT EXISTS public.loyalty_points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type VARCHAR NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_transactions_user ON public.loyalty_points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_transactions_created ON public.loyalty_points_transactions(created_at DESC);

-- Create referral codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(12) NOT NULL UNIQUE,
    creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    bonus_points_per_use INTEGER DEFAULT 100,
    bonus_points_to_referrer INTEGER DEFAULT 100,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_referral_codes_creator ON public.referral_codes(creator_user_id);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referral_codes_is_active ON public.referral_codes(is_active);

-- Create referral uses table (tracks who used each code)
CREATE TABLE IF NOT EXISTS public.referral_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points_awarded_to_referrer INTEGER,
    points_awarded_to_referee INTEGER,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(referral_code_id, referred_user_id)
);

CREATE INDEX idx_referral_uses_code_id ON public.referral_uses(referral_code_id);
CREATE INDEX idx_referral_uses_referred_user ON public.referral_uses(referred_user_id);
CREATE INDEX idx_referral_uses_referrer_user ON public.referral_uses(referrer_user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR AS $$
DECLARE
    new_code VARCHAR(8);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 8);
        new_code := UPPER(new_code);
        
        SELECT EXISTS(
            SELECT 1 FROM public.referral_codes WHERE code = new_code
        ) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to create referral code for user
CREATE OR REPLACE FUNCTION create_referral_code(
    p_user_id UUID,
    p_max_uses INTEGER DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(code VARCHAR, expires_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    INSERT INTO public.referral_codes (
        code,
        creator_user_id,
        max_uses,
        expires_at
    )
    VALUES (
        generate_referral_code(),
        p_user_id,
        p_max_uses,
        p_expires_at
    )
    RETURNING 
        referral_codes.code,
        referral_codes.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply referral code (used during checkout/signup)
CREATE OR REPLACE FUNCTION apply_referral_code(
    p_code VARCHAR,
    p_referred_user_id UUID
)
RETURNS TABLE(success BOOLEAN, message VARCHAR, points_awarded INTEGER) AS $$
DECLARE
    v_referral_code_id UUID;
    v_referrer_user_id UUID;
    v_is_active BOOLEAN;
    v_max_uses INTEGER;
    v_current_uses INTEGER;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_bonus_points_referee INTEGER;
    v_bonus_points_referrer INTEGER;
BEGIN
    -- Get referral code details
    SELECT id, creator_user_id, is_active, max_uses, current_uses, expires_at, 
           bonus_points_per_use, bonus_points_to_referrer
    INTO v_referral_code_id, v_referrer_user_id, v_is_active, v_max_uses, v_current_uses, 
         v_expires_at, v_bonus_points_referee, v_bonus_points_referrer
    FROM public.referral_codes
    WHERE code = UPPER(p_code);

    -- Validation checks
    IF v_referral_code_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Referral code not found'::VARCHAR, 0::INTEGER;
        RETURN;
    END IF;

    IF NOT v_is_active THEN
        RETURN QUERY SELECT FALSE, 'Referral code is inactive'::VARCHAR, 0::INTEGER;
        RETURN;
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RETURN QUERY SELECT FALSE, 'Referral code has expired'::VARCHAR, 0::INTEGER;
        RETURN;
    END IF;

    IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
        RETURN QUERY SELECT FALSE, 'Referral code usage limit reached'::VARCHAR, 0::INTEGER;
        RETURN;
    END IF;

    -- Check if user already used this code
    IF EXISTS(SELECT 1 FROM public.referral_uses WHERE referral_code_id = v_referral_code_id AND referred_user_id = p_referred_user_id) THEN
        RETURN QUERY SELECT FALSE, 'You have already used this referral code'::VARCHAR, 0::INTEGER;
        RETURN;
    END IF;

    -- Award points to referee
    INSERT INTO public.loyalty_points_transactions (
        user_id,
        points,
        transaction_type,
        description,
        created_at
    )
    VALUES (
        p_referred_user_id,
        v_bonus_points_referee,
        'referral_bonus'::loyalty_transaction_type,
        'Referral bonus from code: ' || p_code,
        NOW()
    );

    -- Award points to referrer
    INSERT INTO public.loyalty_points_transactions (
        user_id,
        points,
        transaction_type,
        description,
        created_at
    )
    VALUES (
        v_referrer_user_id,
        v_bonus_points_referrer,
        'referral_bonus'::loyalty_transaction_type,
        'Referral bonus - referred user used code: ' || p_code,
        NOW()
    );

    -- Record the referral use
    INSERT INTO public.referral_uses (
        referral_code_id,
        referred_user_id,
        referrer_user_id,
        points_awarded_to_referrer,
        points_awarded_to_referee
    )
    VALUES (
        v_referral_code_id,
        p_referred_user_id,
        v_referrer_user_id,
        v_bonus_points_referrer,
        v_bonus_points_referee
    );

    -- Increment usage count
    UPDATE public.referral_codes
    SET current_uses = current_uses + 1, updated_at = NOW()
    WHERE id = v_referral_code_id;

    -- Log to audit
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        new_values,
        description
    )
    VALUES (
        p_referred_user_id,
        'referral_code_applied'::audit_action_type,
        'referral_uses',
        (SELECT id FROM public.referral_uses WHERE referral_code_id = v_referral_code_id AND referred_user_id = p_referred_user_id LIMIT 1)::text,
        jsonb_build_object('points_awarded', v_bonus_points_referee),
        'Applied referral code: ' || p_code
    );

    RETURN QUERY SELECT TRUE, 'Referral code applied successfully!'::VARCHAR, (v_bonus_points_referee + v_bonus_points_referrer)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral stats for a user
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE(
    referral_code VARCHAR,
    total_referrals INTEGER,
    total_bonus_points INTEGER,
    code_is_active BOOLEAN,
    code_expires_at TIMESTAMP WITH TIME ZONE,
    code_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rc.code,
        COUNT(ru.id)::INTEGER as total_referrals,
        COALESCE(SUM(ru.points_awarded_to_referrer), 0)::INTEGER as total_bonus_points,
        rc.is_active,
        rc.expires_at,
        rc.created_at
    FROM public.referral_codes rc
    LEFT JOIN public.referral_uses ru ON rc.id = ru.referral_code_id
    WHERE rc.creator_user_id = p_user_id
    GROUP BY rc.id, rc.code, rc.is_active, rc.expires_at, rc.created_at
    ORDER BY rc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get people referred by a user
CREATE OR REPLACE FUNCTION get_referred_users(p_user_id UUID)
RETURNS TABLE(
    referred_user_id UUID,
    referred_user_email VARCHAR,
    referral_code VARCHAR,
    points_awarded INTEGER,
    referred_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ru.referred_user_id,
        u.email::VARCHAR,
        rc.code,
        ru.points_awarded_to_referrer,
        ru.used_at
    FROM public.referral_uses ru
    JOIN public.referral_codes rc ON ru.referral_code_id = rc.id
    JOIN auth.users u ON ru.referred_user_id = u.id
    WHERE rc.creator_user_id = p_user_id
    ORDER BY ru.used_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral codes
CREATE POLICY "users_read_own_referral_codes" ON public.referral_codes
    FOR SELECT TO authenticated
    USING (creator_user_id = auth.uid());

-- Users can create referral codes
CREATE POLICY "users_create_referral_codes" ON public.referral_codes
    FOR INSERT TO authenticated
    WITH CHECK (creator_user_id = auth.uid());

-- Users can read referral uses for their codes
CREATE POLICY "users_read_referral_uses" ON public.referral_uses
    FOR SELECT TO authenticated
    USING (
        referrer_user_id = auth.uid() OR
        referred_user_id = auth.uid()
    );
