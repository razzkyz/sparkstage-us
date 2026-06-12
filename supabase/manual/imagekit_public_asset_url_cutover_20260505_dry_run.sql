BEGIN;

-- Dry-run only by default.
-- This file rewrites runtime public Supabase Storage URLs to ImageKit URLs inside
-- the transaction, prints verification queries, then ROLLBACKs at the end.
-- After explicit production approval, change the final ROLLBACK to COMMIT.
--
-- Do not rewrite product_images.provider_original_url here. That column is
-- migration audit metadata, not a primary public delivery URL.

CREATE OR REPLACE FUNCTION pg_temp.imagekit_public_asset_url_20260505(value text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_url text;
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN value;
  END IF;

  base_url := split_part(value, '?', 1);

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/banners/banners/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/banners/banners/',
      'https://ik.imagekit.io/hjnuyz1t3/public/banners/'
    );
  END IF;

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/posters/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/posters/',
      'https://ik.imagekit.io/hjnuyz1t3/public/beauty/posters/'
    );
  END IF;

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/beauty-images/glam/',
      'https://ik.imagekit.io/hjnuyz1t3/public/beauty/glam/'
    );
  END IF;

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/dressing-room-images/1/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/dressing-room-images/1/',
      'https://ik.imagekit.io/hjnuyz1t3/public/dressing-room/'
    );
  END IF;

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/render/image/public/dressing-room-images/1/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/render/image/public/dressing-room-images/1/',
      'https://ik.imagekit.io/hjnuyz1t3/public/dressing-room/'
    );
  END IF;

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/events-schedule/items/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/events-schedule/items/',
      'https://ik.imagekit.io/hjnuyz1t3/public/events-schedule/items/'
    );
  END IF;

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/events-schedule/settings/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/events-schedule/settings/',
      'https://ik.imagekit.io/hjnuyz1t3/public/events-schedule/settings/'
    );
  END IF;

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/charm-bar-assets/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/charm-bar-assets/',
      'https://ik.imagekit.io/hjnuyz1t3/public/charm-bar-assets/'
    );
  END IF;

  IF base_url LIKE 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/stage-gallery/%' THEN
    RETURN replace(
      base_url,
      'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/stage-gallery/',
      'https://ik.imagekit.io/hjnuyz1t3/public/stage-gallery/'
    );
  END IF;

  RETURN value;
END
$$;

SELECT 'before:banners' AS check_name, count(*) AS legacy_rows
FROM public.banners
WHERE image_url LIKE '%supabase.co/storage/%'
   OR title_image_url LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'before:beauty_posters', count(*)
FROM public.beauty_posters
WHERE image_url LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'before:dressing_room_look_photos', count(*)
FROM public.dressing_room_look_photos
WHERE image_url LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'before:stage_gallery', count(*)
FROM public.stage_gallery
WHERE image_url LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'before:charm_bar_page_settings', count(*)
FROM public.charm_bar_page_settings
WHERE concat_ws(
  ' ',
  hero_image_url,
  category_images::text,
  quick_links::text,
  steps::text,
  video_cards::text,
  how_it_works_video_url
) LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'before:news_page_settings', count(*)
FROM public.news_page_settings
WHERE concat_ws(' ', section_1_image, section_2_image, section_3_products::text) LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'before:event_page_settings', count(*)
FROM public.event_page_settings
WHERE array_to_string(hero_images, ' ') LIKE '%supabase.co/storage/%'
   OR array_to_string(magic_images, ' ') LIKE '%supabase.co/storage/%'
   OR array_to_string(experience_images, ' ') LIKE '%supabase.co/storage/%';

UPDATE public.banners
SET
  image_url = pg_temp.imagekit_public_asset_url_20260505(image_url),
  title_image_url = pg_temp.imagekit_public_asset_url_20260505(title_image_url)
WHERE image_url LIKE '%supabase.co/storage/%'
   OR title_image_url LIKE '%supabase.co/storage/%';

UPDATE public.beauty_posters
SET image_url = pg_temp.imagekit_public_asset_url_20260505(image_url)
WHERE image_url LIKE '%supabase.co/storage/%';

UPDATE public.dressing_room_look_photos
SET image_url = pg_temp.imagekit_public_asset_url_20260505(image_url)
WHERE image_url LIKE '%supabase.co/storage/%';

UPDATE public.stage_gallery
SET image_url = pg_temp.imagekit_public_asset_url_20260505(image_url)
WHERE image_url LIKE '%supabase.co/storage/%';

UPDATE public.charm_bar_page_settings
SET
  hero_image_url = pg_temp.imagekit_public_asset_url_20260505(hero_image_url),
  how_it_works_video_url = pg_temp.imagekit_public_asset_url_20260505(how_it_works_video_url),
  category_images = CASE
    WHEN jsonb_typeof(category_images) = 'array' THEN (
      SELECT coalesce(jsonb_agg(to_jsonb(pg_temp.imagekit_public_asset_url_20260505(value #>> '{}')) ORDER BY ordinality), '[]'::jsonb)
      FROM jsonb_array_elements(category_images) WITH ORDINALITY AS arr(value, ordinality)
    )
    ELSE category_images
  END,
  quick_links = CASE
    WHEN jsonb_typeof(quick_links) = 'array' THEN (
      SELECT coalesce(jsonb_agg(
        CASE
          WHEN jsonb_typeof(link) <> 'object' THEN link
          ELSE (
            CASE
              WHEN link ? 'image_urls' AND jsonb_typeof(link->'image_urls') = 'array' THEN
                jsonb_set(
                  CASE
                    WHEN link ? 'image_url' THEN jsonb_set(link, '{image_url}', to_jsonb(pg_temp.imagekit_public_asset_url_20260505(link->>'image_url')), true)
                    ELSE link
                  END,
                  '{image_urls}',
                  (
                    SELECT coalesce(jsonb_agg(to_jsonb(pg_temp.imagekit_public_asset_url_20260505(value #>> '{}')) ORDER BY ordinality), '[]'::jsonb)
                    FROM jsonb_array_elements(link->'image_urls') WITH ORDINALITY AS urls(value, ordinality)
                  ),
                  true
                )
              WHEN link ? 'image_url' THEN jsonb_set(link, '{image_url}', to_jsonb(pg_temp.imagekit_public_asset_url_20260505(link->>'image_url')), true)
              ELSE link
            END
          )
        END
        ORDER BY ordinality
      ), '[]'::jsonb)
      FROM jsonb_array_elements(quick_links) WITH ORDINALITY AS links(link, ordinality)
    )
    ELSE quick_links
  END,
  steps = CASE
    WHEN jsonb_typeof(steps) = 'array' THEN (
      SELECT coalesce(jsonb_agg(
        CASE
          WHEN jsonb_typeof(step) = 'object' AND step ? 'image_url'
            THEN jsonb_set(step, '{image_url}', to_jsonb(pg_temp.imagekit_public_asset_url_20260505(step->>'image_url')), true)
          ELSE step
        END
        ORDER BY ordinality
      ), '[]'::jsonb)
      FROM jsonb_array_elements(steps) WITH ORDINALITY AS arr(step, ordinality)
    )
    ELSE steps
  END,
  video_cards = CASE
    WHEN jsonb_typeof(video_cards) = 'array' THEN (
      SELECT coalesce(jsonb_agg(
        CASE
          WHEN jsonb_typeof(card) = 'object' AND card ? 'video_url'
            THEN jsonb_set(card, '{video_url}', to_jsonb(pg_temp.imagekit_public_asset_url_20260505(card->>'video_url')), true)
          ELSE card
        END
        ORDER BY ordinality
      ), '[]'::jsonb)
      FROM jsonb_array_elements(video_cards) WITH ORDINALITY AS arr(card, ordinality)
    )
    ELSE video_cards
  END
WHERE concat_ws(
  ' ',
  hero_image_url,
  category_images::text,
  quick_links::text,
  steps::text,
  video_cards::text,
  how_it_works_video_url
) LIKE '%supabase.co/storage/%';

UPDATE public.news_page_settings
SET
  section_1_image = pg_temp.imagekit_public_asset_url_20260505(section_1_image),
  section_2_image = pg_temp.imagekit_public_asset_url_20260505(section_2_image),
  section_3_products = CASE
    WHEN jsonb_typeof(section_3_products) = 'array' THEN (
      SELECT coalesce(jsonb_agg(
        CASE
          WHEN jsonb_typeof(product) = 'object' AND product ? 'image'
            THEN jsonb_set(product, '{image}', to_jsonb(pg_temp.imagekit_public_asset_url_20260505(product->>'image')), true)
          ELSE product
        END
        ORDER BY ordinality
      ), '[]'::jsonb)
      FROM jsonb_array_elements(section_3_products) WITH ORDINALITY AS arr(product, ordinality)
    )
    ELSE section_3_products
  END
WHERE concat_ws(' ', section_1_image, section_2_image, section_3_products::text) LIKE '%supabase.co/storage/%';

UPDATE public.event_page_settings
SET
  hero_images = ARRAY(
    SELECT pg_temp.imagekit_public_asset_url_20260505(value)
    FROM unnest(hero_images) WITH ORDINALITY AS arr(value, ordinality)
    ORDER BY ordinality
  ),
  magic_images = ARRAY(
    SELECT pg_temp.imagekit_public_asset_url_20260505(value)
    FROM unnest(magic_images) WITH ORDINALITY AS arr(value, ordinality)
    ORDER BY ordinality
  ),
  experience_images = ARRAY(
    SELECT pg_temp.imagekit_public_asset_url_20260505(value)
    FROM unnest(experience_images) WITH ORDINALITY AS arr(value, ordinality)
    ORDER BY ordinality
  )
WHERE array_to_string(hero_images, ' ') LIKE '%supabase.co/storage/%'
   OR array_to_string(magic_images, ' ') LIKE '%supabase.co/storage/%'
   OR array_to_string(experience_images, ' ') LIKE '%supabase.co/storage/%';

SELECT 'after:banners' AS check_name, count(*) AS legacy_rows
FROM public.banners
WHERE image_url LIKE '%supabase.co/storage/%'
   OR title_image_url LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'after:beauty_posters', count(*)
FROM public.beauty_posters
WHERE image_url LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'after:dressing_room_look_photos', count(*)
FROM public.dressing_room_look_photos
WHERE image_url LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'after:stage_gallery', count(*)
FROM public.stage_gallery
WHERE image_url LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'after:charm_bar_page_settings', count(*)
FROM public.charm_bar_page_settings
WHERE concat_ws(
  ' ',
  hero_image_url,
  category_images::text,
  quick_links::text,
  steps::text,
  video_cards::text,
  how_it_works_video_url
) LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'after:news_page_settings', count(*)
FROM public.news_page_settings
WHERE concat_ws(' ', section_1_image, section_2_image, section_3_products::text) LIKE '%supabase.co/storage/%'
UNION ALL
SELECT 'after:event_page_settings', count(*)
FROM public.event_page_settings
WHERE array_to_string(hero_images, ' ') LIKE '%supabase.co/storage/%'
   OR array_to_string(magic_images, ' ') LIKE '%supabase.co/storage/%'
   OR array_to_string(experience_images, ' ') LIKE '%supabase.co/storage/%';

SELECT
  bucket_id,
  name AS storage_object_name,
  metadata->>'size' AS size_bytes,
  CASE
    WHEN bucket_id = 'banners' AND name LIKE 'banners/%' THEN '/public/banners/' || substring(name from length('banners/') + 1)
    WHEN bucket_id = 'beauty-images' AND name LIKE 'posters/%' THEN '/public/beauty/posters/' || substring(name from length('posters/') + 1)
    WHEN bucket_id = 'beauty-images' AND name LIKE 'glam/%' THEN '/public/beauty/glam/' || substring(name from length('glam/') + 1)
    WHEN bucket_id = 'dressing-room-images' AND name LIKE '1/%' THEN '/public/dressing-room/' || substring(name from length('1/') + 1)
    WHEN bucket_id = 'events-schedule' THEN '/public/events-schedule/' || name
    WHEN bucket_id = 'charm-bar-assets' THEN '/public/charm-bar-assets/' || name
    WHEN bucket_id = 'stage-gallery' THEN '/public/stage-gallery/' || name
    ELSE null
  END AS expected_imagekit_file_path
FROM storage.objects
WHERE bucket_id IN (
  'banners',
  'beauty-images',
  'dressing-room-images',
  'events-schedule',
  'charm-bar-assets',
  'stage-gallery'
)
ORDER BY bucket_id, name
LIMIT 200;

ROLLBACK;
