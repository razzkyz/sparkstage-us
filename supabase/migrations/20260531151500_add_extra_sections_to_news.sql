ALTER TABLE public.news_page_settings
ADD COLUMN IF NOT EXISTS extra_sections JSONB NOT NULL DEFAULT '[]'::jsonb;
