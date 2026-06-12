ALTER TABLE public.news_page_settings
ADD COLUMN IF NOT EXISTS section_order JSONB NOT NULL DEFAULT '["section_1", "section_2", "section_3"]'::jsonb;
