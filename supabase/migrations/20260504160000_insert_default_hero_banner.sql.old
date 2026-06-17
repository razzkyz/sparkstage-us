-- Insert default hero banner for OnStage page
-- This fixes the missing hero banner issue

INSERT INTO public.banners (
  title,
  subtitle,
  image_url,
  title_image_url,
  link_url,
  banner_type,
  display_order,
  is_active,
  created_at,
  updated_at
) VALUES (
  'SPARK ON STAGE',
  'Be A Star',
  '/images/landing/hero-banner.jpg',
  NULL,
  '/on-stage',
  'hero',
  1,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
