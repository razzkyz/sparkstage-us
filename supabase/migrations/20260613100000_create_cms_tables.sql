-- Create CMS settings tables for US version
-- These tables store customizable page content for public-facing pages

-- ============================================================================
-- 1. NEWS PAGE SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.news_page_settings (
    id TEXT PRIMARY KEY DEFAULT 'default-news-page-settings',
    section_1_category TEXT DEFAULT 'FASHION',
    section_1_title TEXT DEFAULT 'HOW TO DRESS LIKE A STAR - GIRL?',
    section_1_excerpt TEXT DEFAULT 'FROM FEATHER TOPS TO SAINT LAURENT HAND BAGS.',
    section_1_description TEXT,
    section_1_author TEXT DEFAULT 'By Staff Writer',
    section_1_image TEXT,
    section_2_title TEXT DEFAULT 'SHE A COLD-HEARTED\nB!TCH WITH NO SHAME',
    section_2_subtitle1 TEXT DEFAULT 'Escape from LA',
    section_2_subtitle2 TEXT DEFAULT '(THE WEEKEND)',
    section_2_quotes TEXT DEFAULT 'SHE GOT\n*CHROME .. HEARTS*\nHANGIN'' FROM HER NECK',
    section_2_image TEXT,
    section_3_title TEXT DEFAULT 'HER ESSENTIALS !',
    section_3_products JSONB DEFAULT '[]'::jsonb,
    section_fonts JSONB DEFAULT '{
        "section_1": {"heading": "cardo", "body": "nunito_sans"},
        "section_2": {"heading": "cardo", "body": "nunito_sans"},
        "section_3": {"heading": "cardo", "body": "nunito_sans"}
    }'::jsonb,
    extra_sections JSONB DEFAULT '[]'::jsonb,
    section_order JSONB DEFAULT '["section_1", "section_2", "section_3"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default news page settings
INSERT INTO public.news_page_settings (id)
VALUES ('default-news-page-settings')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. EVENT PAGE SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_page_settings (
    id TEXT PRIMARY KEY DEFAULT 'default-event-page-settings',
    hero_images TEXT[] DEFAULT ARRAY[
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1541250848049-b4f7141fca3f?auto=format&fit=crop&q=80'
    ],
    magic_title TEXT DEFAULT 'CAPTURING your MAGIC MOMENT',
    magic_description TEXT,
    magic_button_text TEXT DEFAULT 'LEARN MORE',
    magic_button_link TEXT DEFAULT '#',
    magic_images TEXT[] DEFAULT ARRAY['https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80'],
    experience_title TEXT DEFAULT 'CHOOSE your EXPERIENCE',
    experience_images TEXT[] DEFAULT ARRAY[
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1541250848049-b4f7141fca3f?auto=format&fit=crop&q=80'
    ],
    experience_links JSONB DEFAULT '[
        {"title": "1.", "subtitle": "EXPLORE EVENTS", "link": "/events"},
        {"title": "2.", "subtitle": "SHOP PRODUCTS", "link": "/shop"},
        {"title": "3.", "subtitle": "CONTACT US", "link": "#"}
    ]'::jsonb,
    section_fonts JSONB DEFAULT '{
        "magic": {"heading": "cardo", "body": "nunito_sans"},
        "experience": {"heading": "cardo", "body": "nunito_sans"}
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default event page settings
INSERT INTO public.event_page_settings (id)
VALUES ('default-event-page-settings')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. CHARM BAR PAGE SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.charm_bar_page_settings (
    id TEXT PRIMARY KEY DEFAULT 'default-charm-bar-page-settings',
    hero_title TEXT DEFAULT 'Charm Bar',
    hero_subtitle TEXT,
    hero_images TEXT[] DEFAULT '{}',
    about_title TEXT DEFAULT 'About Charm Bar',
    about_description TEXT,
    about_images TEXT[] DEFAULT '{}',
    products_title TEXT DEFAULT 'Our Products',
    products_description TEXT,
    section_fonts JSONB DEFAULT '{
        "hero": {"heading": "cardo", "body": "nunito_sans"},
        "about": {"heading": "cardo", "body": "nunito_sans"},
        "products": {"heading": "cardo", "body": "nunito_sans"}
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default charm bar page settings
INSERT INTO public.charm_bar_page_settings (id)
VALUES ('default-charm-bar-page-settings')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. GLAM PAGE SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.glam_page_settings (
    id TEXT PRIMARY KEY DEFAULT 'default-glam-page-settings',
    hero_title TEXT DEFAULT 'GLAM',
    hero_subtitle TEXT,
    hero_image_url TEXT,
    about_title TEXT DEFAULT 'About GLAM',
    about_description TEXT,
    about_image_url TEXT,
    services_title TEXT DEFAULT 'Our Services',
    services_description TEXT,
    section_fonts JSONB DEFAULT '{
        "hero": {"heading": "cardo", "body": "nunito_sans"},
        "about": {"heading": "cardo", "body": "nunito_sans"},
        "services": {"heading": "cardo", "body": "nunito_sans"}
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default glam page settings
INSERT INTO public.glam_page_settings (id)
VALUES ('default-glam-page-settings')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.news_page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charm_bar_page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glam_page_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Public Read, Admin Write
-- ============================================================================

-- News Page Settings Policies
CREATE POLICY "Anyone can view news page settings"
    ON public.news_page_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can update news page settings"
    ON public.news_page_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            WHERE ura.user_id = auth.uid()
            AND ura.role IN ('admin', 'super_admin')
        )
    );

-- Event Page Settings Policies
CREATE POLICY "Anyone can view event page settings"
    ON public.event_page_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can update event page settings"
    ON public.event_page_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            WHERE ura.user_id = auth.uid()
            AND ura.role IN ('admin', 'super_admin')
        )
    );

-- Charm Bar Page Settings Policies
CREATE POLICY "Anyone can view charm bar page settings"
    ON public.charm_bar_page_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can update charm bar page settings"
    ON public.charm_bar_page_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            WHERE ura.user_id = auth.uid()
            AND ura.role IN ('admin', 'super_admin')
        )
    );

-- GLAM Page Settings Policies
CREATE POLICY "Anyone can view glam page settings"
    ON public.glam_page_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can update glam page settings"
    ON public.glam_page_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            WHERE ura.user_id = auth.uid()
            AND ura.role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for each table
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.news_page_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.event_page_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.charm_bar_page_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.glam_page_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.news_page_settings IS 'CMS settings for news page';
COMMENT ON TABLE public.event_page_settings IS 'CMS settings for events page';
COMMENT ON TABLE public.charm_bar_page_settings IS 'CMS settings for charm bar page';
COMMENT ON TABLE public.glam_page_settings IS 'CMS settings for GLAM page';
