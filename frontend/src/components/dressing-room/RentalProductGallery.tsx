import { useState } from 'react';
import { motion } from 'framer-motion';
import { ProductImageCarousel } from '../ProductImageCarousel';
import { formatCurrency } from '../../utils/formatters';
import type { DressingRoomLook } from '../../hooks/useDressingRoomCollection';

interface RentalProductGalleryProps {
  look: DressingRoomLook;
  showPricing?: boolean;
  durationDays?: number;
}

export function RentalProductGallery({ look, showPricing = false, durationDays = 1 }: RentalProductGalleryProps) {
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  const items = look.items.filter(item => item.product_variant);
  
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Tidak ada produk dalam look ini
      </div>
    );
  }

  const selectedItem = items[selectedItemIndex];
  const product = selectedItem?.product_variant?.product;

  // Get product images - if multiple exist in the database, otherwise use main image
  const productImages = product?.image_url 
    ? [product.image_url]
    : [];

  const DAILY_FEE_PER_ITEM = 15000; // 15k per day per item
  const productPrice = selectedItem?.product_variant?.price || 0;
  const depositPrice = Math.ceil(productPrice * 0.75);
  const rentalCostForDuration = DAILY_FEE_PER_ITEM * durationDays;
  const totalForDuration = productPrice + depositPrice + rentalCostForDuration;

  return (
    <div className="space-y-6">
      {/* Gallery Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Image Carousel */}
        <div className="lg:col-span-2">
          <motion.div
            key={selectedItemIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ProductImageCarousel
              images={productImages}
              alt={product?.name || 'Product image'}
              className="w-full"
            />
          </motion.div>
        </div>

        {/* Product Info */}
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500">
              Item {selectedItemIndex + 1} dari {items.length}
            </p>
            <h3 className="mt-2 font-bold text-lg text-gray-900">
              {product?.name}
            </h3>
            <p className="mt-1 text-sm font-semibold text-main-600">
              {selectedItem.product_variant?.name}
            </p>
            {selectedItem.label && (
              <p className="mt-1 text-sm text-gray-600 italic">
                {selectedItem.label}
              </p>
            )}
          </div>

          {showPricing && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Harga Produk</span>
                <span className="font-bold text-gray-900">{formatCurrency(productPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sewa / hari</span>
                <span className="font-bold text-gray-900">{formatCurrency(DAILY_FEE_PER_ITEM)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Deposit (75%)</span>
                <span className="font-bold text-gray-900">{formatCurrency(depositPrice)}</span>
              </div>
              {durationDays > 1 && (
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Total ({durationDays} hari)</span>
                  <span className="font-bold text-lg text-main-600">{formatCurrency(totalForDuration)}</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation info */}
          <p className="text-xs text-gray-500 italic">
            Gunakan tombol panah di gambar untuk melihat tampilan produk dari sudut lain
          </p>
        </div>
      </div>

      {/* Product Selector - Thumbnail Strip */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-gray-500">Produk dalam Look ini</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {items.map((item, index) => {
            const isSelected = index === selectedItemIndex;
            const itemProduct = item.product_variant?.product;
            const itemImage = itemProduct?.image_url;

            return (
              <motion.button
                key={`${item.id}-${index}`}
                type="button"
                onClick={() => setSelectedItemIndex(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`shrink-0 relative rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-main-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {itemImage ? (
                  <img
                    src={itemImage}
                    alt={itemProduct?.name}
                    className="w-20 h-20 object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-300">image</span>
                  </div>
                )}
                
                {isSelected && (
                  <div className="absolute inset-0 bg-main-500/10 border-2 border-main-500" />
                )}

                {/* Item count badge */}
                <div className="absolute top-0 right-0 bg-main-500 text-white text-xs font-bold px-2 py-1 rounded-bl">
                  {item.product_variant?.name.split('-')[1]?.trim() || `Item ${index + 1}`}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
