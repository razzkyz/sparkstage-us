BEGIN;

-- Public non-product asset cutover:
-- Supabase Storage -> ImageKit
-- Endpoint final: https://ik.imagekit.io/hjnuyz1t3/public

-- 1) banners
UPDATE public.banners
SET image_url = REPLACE(
  image_url,
  'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/banners/banners/',
  'https://ik.imagekit.io/hjnuyz1t3/public/banners/'
)
WHERE image_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/banners/banners/%';

UPDATE public.banners
SET title_image_url = REPLACE(
  title_image_url,
  'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/banners/banners/',
  'https://ik.imagekit.io/hjnuyz1t3/public/banners/'
)
WHERE title_image_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/banners/banners/%';

-- 2) beauty posters
UPDATE public.beauty_posters
SET image_url = REPLACE(
  image_url,
  'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/posters/',
  'https://ik.imagekit.io/hjnuyz1t3/public/beauty/posters/'
)
WHERE image_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/posters/%';

-- 3) glam page singleton
UPDATE public.glam_page_settings
SET hero_image_url = REPLACE(
  hero_image_url,
  'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/',
  'https://ik.imagekit.io/hjnuyz1t3/public/beauty/glam/'
)
WHERE hero_image_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/%';

UPDATE public.glam_page_settings
SET look_model_image_url = REPLACE(
  look_model_image_url,
  'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/',
  'https://ik.imagekit.io/hjnuyz1t3/public/beauty/glam/'
)
WHERE look_model_image_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/%';

UPDATE public.glam_page_settings
SET look_star_links = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(elem) = 'object'
        AND elem ? 'image_url'
        AND (elem->>'image_url') LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/%'
      THEN jsonb_set(
        elem,
        '{image_url}',
        to_jsonb(
          REPLACE(
            elem->>'image_url',
            'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/',
            'https://ik.imagekit.io/hjnuyz1t3/public/beauty/glam/'
          )
        )
      )
      ELSE elem
    END
    ORDER BY ordinality
  )
  FROM jsonb_array_elements(look_star_links) WITH ORDINALITY AS arr(elem, ordinality)
)
WHERE look_star_links IS NOT NULL;

-- 4) dressing room photos
-- Legacy storage path shape: /dressing-room-images/1/<lookId>/<file>
-- ImageKit target shape:     /public/dressing-room/<lookId>/<file>
UPDATE public.dressing_room_look_photos
SET image_url = REPLACE(
  REPLACE(
    image_url,
    'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/dressing-room-images/1/',
    'https://ik.imagekit.io/hjnuyz1t3/public/dressing-room/'
  ),
  'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/render/image/public/dressing-room-images/1/',
  'https://ik.imagekit.io/hjnuyz1t3/public/dressing-room/'
)
WHERE image_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/dressing-room-images/1/%'
   OR image_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/render/image/public/dressing-room-images/1/%';

COMMIT;

-- Verification queries (run separately after COMMIT)
-- SELECT COUNT(*) FROM public.banners WHERE image_url LIKE '%supabase.co/storage/%' OR title_image_url LIKE '%supabase.co/storage/%';
-- SELECT COUNT(*) FROM public.beauty_posters WHERE image_url LIKE '%supabase.co/storage/%';
-- SELECT COUNT(*) FROM public.glam_page_settings
-- WHERE hero_image_url LIKE '%supabase.co/storage/%'
--    OR look_model_image_url LIKE '%supabase.co/storage/%'
--    OR look_star_links::text LIKE '%supabase.co/storage/%';
-- SELECT COUNT(*) FROM public.dressing_room_look_photos WHERE image_url LIKE '%supabase.co/storage/%';
