-- Activate all hero banners to fix the missing banner issue
UPDATE public.banners
SET is_active = true, updated_at = NOW()
WHERE banner_type = 'hero' AND is_active = false;
