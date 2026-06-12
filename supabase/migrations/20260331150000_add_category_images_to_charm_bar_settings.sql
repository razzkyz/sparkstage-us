-- Add category_images column to charm_bar_page_settings
ALTER TABLE public.charm_bar_page_settings
ADD COLUMN IF NOT EXISTS category_images JSONB NOT NULL DEFAULT '[
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%202.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%203.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%203.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%202.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%203.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%202.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%203.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.png",
  "/images/Charm%20Bar%20assets/CHARM%20VISUAL%202.png"
]'::jsonb;
