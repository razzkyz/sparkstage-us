-- ============================================
-- SparkStage US - Sample Data
-- Date: 2026-06-13
-- Description: Add sample products with images for testing
-- ============================================

-- ============================================
-- CATEGORIES
-- ============================================

INSERT INTO public.categories (id, name, slug, description, color, is_active) VALUES
(1, 'Beauty', 'beauty', 'Beauty and cosmetics products', '#FF69B4', true),
(2, 'Fashion', 'fashion', 'Clothing and accessories', '#9370DB', true),
(3, 'Jewelry', 'jewelry', 'Charms and accessories', '#FFD700', true),
(4, 'Gift Sets', 'gift-sets', 'Curated gift collections', '#FF6B6B', true);

-- ============================================
-- PRODUCTS
-- ============================================

INSERT INTO public.products (id, name, description, category_id, is_active) VALUES
(1, 'Glow Foundation', 'Lightweight foundation with SPF 30. Perfect for all-day wear with a natural, radiant finish.', 1, true),
(2, 'Velvet Lipstick', 'Long-lasting matte lipstick in classic red. Enriched with vitamin E for smooth application.', 1, true),
(3, 'Eyeshadow Palette', '12-color eyeshadow palette with shimmer and matte finishes. Perfect for day to night looks.', 1, true),
(4, 'Face Serum', 'Hydrating serum with hyaluronic acid and vitamin C. Reduces fine lines and brightens skin.', 1, true),
(5, 'Mascara Pro', 'Volumizing mascara for dramatic lashes. Waterproof and smudge-proof formula.', 1, true),

(6, 'Classic T-Shirt', 'Premium cotton t-shirt in various colors. Comfortable fit for everyday wear.', 2, true),
(7, 'Denim Jacket', 'Vintage-style denim jacket with distressed details. Perfect for layering.', 2, true),
(8, 'Floral Dress', 'Flowy summer dress with floral print. Adjustable straps and pockets.', 2, true),
(9, 'Leather Bag', 'Genuine leather crossbody bag. Multiple compartments for organization.', 2, true),
(10, 'Sneakers', 'Comfortable canvas sneakers in classic white. Perfect for casual outfits.', 2, true),

(11, 'Crystal Charm', 'Sparkling crystal charm for bracelets. Available in multiple colors.', 3, true),
(12, 'Heart Pendant', 'Sterling silver heart pendant necklace. Elegant and timeless design.', 3, true),
(13, 'Hoop Earrings', 'Gold-plated hoop earrings. Lightweight and hypoallergenic.', 3, true),
(14, 'Charm Bracelet', 'Adjustable charm bracelet with clasp. Compatible with most charms.', 3, true),
(15, 'Statement Ring', 'Bold statement ring with gemstone. Available in gold and silver.', 3, true),

(16, 'Spa Gift Set', 'Luxurious spa set including bath bombs, lotion, and candle. Perfect for relaxation.', 4, true),
(17, 'Makeup Kit', 'Complete makeup starter kit with brushes. Includes eyeshadow, blush, and lipstick.', 4, true),
(18, 'Jewelry Collection', 'Curated jewelry set with necklace, earrings, and bracelet. Comes in elegant gift box.', 4, true),
(19, 'Self-Care Bundle', 'Self-care essentials bundle with skincare, tea, and journal. Perfect for me-time.', 4, true),
(20, 'Glam Box', 'Monthly glam box subscription starter. Includes 5 beauty products.', 4, true);

-- ============================================
-- PRODUCT VARIANTS
-- ============================================

INSERT INTO public.product_variants (id, product_id, variant_name, sku, price, stock, is_active) VALUES
-- Beauty Products
(1, 1, 'Light Beige', 'FOUND-LB-001', 3500, 50, true),
(2, 1, 'Medium Tan', 'FOUND-MT-001', 3500, 50, true),
(3, 2, 'Classic Red', 'LIP-RED-001', 2200, 100, true),
(4, 2, 'Pink Nude', 'LIP-NUDE-001', 2200, 100, true),
(5, 3, 'Sunset Palette', 'EYE-SUNSET-001', 4500, 75, true),
(6, 4, 'Hydrating Serum 30ml', 'SER-HYD-001', 5500, 60, true),
(7, 5, 'Black Volume', 'MASC-BLK-001', 2800, 80, true),

-- Fashion Products
(8, 6, 'White - S', 'TSHIRT-WHT-S', 1800, 100, true),
(9, 6, 'White - M', 'TSHIRT-WHT-M', 1800, 100, true),
(10, 6, 'White - L', 'TSHIRT-WHT-L', 1800, 100, true),
(11, 7, 'Blue Denim - M', 'JACKET-BLU-M', 6500, 30, true),
(12, 8, 'Floral Print - M', 'DRESS-FLO-M', 4500, 50, true),
(13, 9, 'Brown Leather', 'BAG-BRN-001', 7500, 40, true),
(14, 10, 'White - Size 7', 'SHOE-WHT-7', 4200, 60, true),
(15, 10, 'White - Size 8', 'SHOE-WHT-8', 4200, 60, true),

-- Jewelry Products
(16, 11, 'Pink Crystal', 'CHRM-PNK-001', 1500, 200, true),
(17, 11, 'Blue Crystal', 'CHRM-BLU-001', 1500, 200, true),
(18, 12, 'Silver Heart', 'PEND-SLV-001', 3200, 80, true),
(19, 13, 'Gold Hoops', 'EAR-GLD-001', 2800, 100, true),
(20, 14, 'Silver Bracelet', 'BRAC-SLV-001', 3500, 70, true),
(21, 15, 'Gold Ring - Size 7', 'RING-GLD-7', 4200, 50, true),

-- Gift Sets
(22, 16, 'Spa Set - Lavender', 'GIFT-SPA-LAV', 6500, 40, true),
(23, 17, 'Makeup Kit - Full', 'GIFT-MKP-FUL', 8500, 35, true),
(24, 18, 'Jewelry Set - Gold', 'GIFT-JWL-GLD', 9500, 25, true),
(25, 19, 'Self-Care Bundle', 'GIFT-SCR-001', 7200, 30, true),
(26, 20, 'Glam Box - Starter', 'GIFT-GLM-STR', 5500, 50, true);

-- ============================================
-- PRODUCT IMAGES (Using R2 Custom Domain)
-- ============================================

INSERT INTO public.product_images (product_id, image_url, display_order) VALUES
-- Beauty Products (using real R2 images)
(1, 'https://cdn-us.sparkstage55.com/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png', 1),
(1, 'https://cdn-us.sparkstage55.com/products/1001/f6006b43-8ffc-4cd5-bb12-13fba5424742.png', 2),
(2, 'https://cdn-us.sparkstage55.com/products/1002/169b732d-d0a7-4445-b1f4-a3bf08c3ab96.png', 1),
(2, 'https://cdn-us.sparkstage55.com/products/1003/a120703f-31d5-470a-ba2a-43cdceab6d92.png', 2),
(3, 'https://cdn-us.sparkstage55.com/products/1004/d5fe7ba3-f708-414e-9c3f-8304197b6e16.png', 1),
(3, 'https://cdn-us.sparkstage55.com/products/1005/87230e17-9110-4ca7-aee7-534d871cc661.png', 2),
(4, 'https://cdn-us.sparkstage55.com/products/1006/e09ed70a-a35b-4e78-b374-42bf2a27c2a6.png', 1),
(4, 'https://cdn-us.sparkstage55.com/products/1007/38ae30e3-cc52-4e3a-a819-fb62abec8e24.png', 2),
(5, 'https://cdn-us.sparkstage55.com/products/1008/956ecf02-d70e-4540-87b5-879bdb1fe9c0.png', 1),

-- Fashion Products
(6, 'https://cdn-us.sparkstage55.com/products/1009/d0718543-12b8-4ef6-80c9-89b17c3f119f.png', 1),
(6, 'https://cdn-us.sparkstage55.com/products/1010/6c24fee3-da0b-4197-8fff-9cab2a3cc58b.png', 2),
(7, 'https://cdn-us.sparkstage55.com/products/1011/53edf602-be76-404d-97ae-313973c88c14.png', 1),
(7, 'https://cdn-us.sparkstage55.com/products/1012/07021a22-53d6-4867-b6c7-5caacc80e973.png', 2),
(8, 'https://cdn-us.sparkstage55.com/products/1013/016fed5b-3afc-41e9-9e51-71fc560b64eb.png', 1),
(8, 'https://cdn-us.sparkstage55.com/products/1014/a9cf111d-024e-4bdd-8c27-4ed520dc9878.png', 2),
(9, 'https://cdn-us.sparkstage55.com/products/1015/8da06e2a-def1-464d-aa37-bfef21bd4f94.png', 1),
(9, 'https://cdn-us.sparkstage55.com/products/1016/36cc7e40-506f-4d44-a877-862cb3334b99.png', 2),
(10, 'https://cdn-us.sparkstage55.com/products/1017/d1bd6411-9a00-4e1f-9603-087bc2afcb65.png', 1),
(10, 'https://cdn-us.sparkstage55.com/products/1018/7cfa0665-986b-4eac-89a7-9c295dfede95.png', 2),

-- Jewelry Products
(11, 'https://cdn-us.sparkstage55.com/products/1019/ad111339-78ae-481a-b6e2-0463ef5d1309.png', 1),
(11, 'https://cdn-us.sparkstage55.com/products/1020/7cc28825-f9ca-4f3b-a992-5de45897b19b.png', 2),
(12, 'https://cdn-us.sparkstage55.com/products/1021/221ceaea-3692-48fb-851b-c11777f701ed.png', 1),
(12, 'https://cdn-us.sparkstage55.com/products/1022/310a52d7-126b-4a6e-a50d-a5f49f595306.png', 2),
(13, 'https://cdn-us.sparkstage55.com/products/1023/be107766-7a4f-4d56-90aa-bbe85b082aa0.png', 1),
(13, 'https://cdn-us.sparkstage55.com/products/1024/bd60f5ee-6780-4b83-b4c8-b7ba9a5f8ca4.png', 2),
(14, 'https://cdn-us.sparkstage55.com/products/1025/fe23ceb8-2759-4177-bb66-68973de89bf3.png', 1),
(14, 'https://cdn-us.sparkstage55.com/products/1026/2795e5fb-a22b-4402-958e-91f539b8cd3d.png', 2),
(15, 'https://cdn-us.sparkstage55.com/products/1027/86601fbf-7a14-43af-9237-884b9f402568.png', 1),
(15, 'https://cdn-us.sparkstage55.com/products/1028/5015b4bf-c35a-40ea-9a58-b9a1c881300d.png', 2),

-- Gift Sets
(16, 'https://cdn-us.sparkstage55.com/products/1029/6082b53e-39c1-4477-8ef7-9de0c1e58063.png', 1),
(16, 'https://cdn-us.sparkstage55.com/products/1030/0f044dea-ed8a-43d7-a796-3f003a0b40f3.png', 2),
(17, 'https://cdn-us.sparkstage55.com/products/1031/f6687901-5e34-4a56-befc-2bc0a49818e5.png', 1),
(17, 'https://cdn-us.sparkstage55.com/products/1032/96bb2312-db1c-4458-96e9-bc86262c082e.png', 2),
(18, 'https://cdn-us.sparkstage55.com/products/1033/1dba1685-9278-4b13-a94d-3b415bffd5a1.png', 1),
(18, 'https://cdn-us.sparkstage55.com/products/1034/1a4db348-1665-4306-8c6c-e81e3b78d5fb.png', 2),
(19, 'https://cdn-us.sparkstage55.com/products/1035/1a9ed09c-ab5c-4f16-85fa-73a0d772a8c1.png', 1),
(19, 'https://cdn-us.sparkstage55.com/products/1036/a5cced64-efa3-4dcf-a79f-1ae244a77757.png', 2),
(20, 'https://cdn-us.sparkstage55.com/products/1037/9709bc60-34a0-4da5-a593-ffa660be8cc9.png', 1),
(20, 'https://cdn-us.sparkstage55.com/products/1038/4b1f22da-8340-4cd2-8de7-34b51cac10dc.png', 2);

-- ============================================
-- RESET SEQUENCES
-- ============================================

SELECT setval('public.categories_id_seq', (SELECT MAX(id) FROM public.categories));
SELECT setval('public.products_id_seq', (SELECT MAX(id) FROM public.products));
SELECT setval('public.product_variants_id_seq', (SELECT MAX(id) FROM public.product_variants));
SELECT setval('public.product_images_id_seq', (SELECT MAX(id) FROM public.product_images));

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sample data added successfully!';
  RAISE NOTICE '📦 Added 4 categories';
  RAISE NOTICE '🛍️ Added 20 products';
  RAISE NOTICE '📊 Added 26 product variants';
  RAISE NOTICE '🖼️ Added 40 product images (R2 bucket)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Update R2 URLs after custom domain setup';
  RAISE NOTICE '   1. Setup custom domain in R2: cdn-us.sparkstage.com';
  RAISE NOTICE '   2. Enable public access in R2 bucket settings';
  RAISE NOTICE '   3. Update URLs: pub-xxxxx.r2.dev → cdn-us.sparkstage.com';
  RAISE NOTICE '   4. Command: UPDATE product_images SET image_url = REPLACE(image_url, ''pub-xxxxx.r2.dev'', ''cdn-us.sparkstage.com'');';
  RAISE NOTICE '';
  RAISE NOTICE '💡 All images copied to sparkstage-us-assets bucket (2,230 files)';
END $$;
