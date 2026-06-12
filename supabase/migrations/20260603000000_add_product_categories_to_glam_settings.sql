-- Add product categories to glam settings
ALTER TABLE public.glam_page_settings
ADD COLUMN IF NOT EXISTS product_categories TEXT[] DEFAULT '{makeup,eyewear,glitter,headliner,popsocket,pop-socket,popsockets,body-glitter,patches,patch,speckles,freckles}'::TEXT[];
