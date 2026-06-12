import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { uploadPublicAssetToImageKit } from '@/lib/publicImagekitUpload';
import { useDressingRoomSubcategoriesBySlug } from '@/hooks/useDressingRoomCatalog';
import ProductImageUpload, { type ImagePreview } from './ProductImageUpload';
import { DressingRoomProductVariantsSection } from './DressingRoomProductVariantsSection';

interface Variant {
  id?: string;
  name: string;
  sku: string;
  size_label: string;
  color: string;
  price: number;
  daily_rental_fee: number;
  total_quantity: number;
}

interface DressingRoomProductModalProps {
  isOpen: boolean;
  initialValue?: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DressingRoomProductModal({ isOpen, initialValue, onClose, onSuccess }: DressingRoomProductModalProps) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useDressingRoomSubcategoriesBySlug('dressing-room');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    category: 'clothing',
    dressing_room_category_id: null as number | null,
    is_active: true,
  });

  const [variants, setVariants] = useState<Variant[]>([
    {
      name: '',
      sku: '',
      size_label: '',
      color: '',
      price: 0,
      daily_rental_fee: 15000,
      total_quantity: 0,
    },
  ]);

  const [images, setImages] = useState<ImagePreview[]>([]);
  const [existingImages, setExistingImages] = useState<{ url: string; is_primary: boolean }[]>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialValue) {
        setFormData({
          name: initialValue.name || '',
          description: initialValue.description || '',
          slug: initialValue.slug || '',
          category: initialValue.category || 'clothing',
          dressing_room_category_id: initialValue.dressing_room_category_id || null,
          is_active: initialValue.is_active !== false,
        });
        
        if (initialValue.dressing_room_product_variants && initialValue.dressing_room_product_variants.length > 0) {
          setVariants(initialValue.dressing_room_product_variants);
        } else {
          setVariants([{ name: '', sku: '', size_label: '', color: '', price: 0, daily_rental_fee: 15000, total_quantity: 0 }]);
        }

        if (initialValue.image_url) {
          setExistingImages([{ url: initialValue.image_url, is_primary: true }]);
        } else {
          setExistingImages([]);
        }
      } else {
        setFormData({ name: '', description: '', slug: '', category: 'clothing', dressing_room_category_id: null, is_active: true });
        setVariants([{ name: '', sku: '', size_label: '', color: '', price: 0, daily_rental_fee: 15000, total_quantity: 0 }]);
        setExistingImages([]);
      }
      setImages([]);
      setRemovedImageUrls([]);
      setError(null);
    }
  }, [isOpen, initialValue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = initialValue?.image_url || null;

      // Handle image deletion
      if (removedImageUrls.includes(finalImageUrl)) {
        finalImageUrl = null;
      }

      // Handle new image upload
      if (images.length > 0) {
        const file = images[0].file;
        const fileName = `dressing-room-product-${Date.now()}-${file.name}`;
        finalImageUrl = await uploadPublicAssetToImageKit({
          file,
          fileName,
          folderPath: 'dressing-room-products',
        });
      }

      // Upsert product
      const { data: productData, error: productError } = await supabase
        .from('dressing_room_products')
        .upsert(
          {
            id: initialValue?.id,
            ...formData,
            image_url: finalImageUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (productError) throw productError;

      // Save variants
      for (const variant of variants) {
        if (!variant.sku) continue;

        const { error: variantError } = await supabase
          .from('dressing_room_product_variants')
          .upsert(
            {
              id: variant.id ? parseInt(variant.id) : undefined,
              dressing_room_product_id: productData.id,
              ...variant,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (variantError) throw variantError;
      }

      return productData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dressing-room-products'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to save product');
    },
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) {
      setError('Name and slug are required');
      return;
    }
    if (!formData.dressing_room_category_id) {
      setError('Category selection is required');
      return;
    }
    if (variants.some(v => !v.sku)) {
      setError('All variants must have a SKU');
      return;
    }
    saveMutation.mutate();
  };

  if (!isOpen) return null;

  const activeExistingImages = existingImages.filter(img => !removedImageUrls.includes(img.url));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={saveMutation.isPending ? undefined : onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl animate-fade-in-scale">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold">{initialValue?.id ? 'Edit Product' : 'Add Product'}</h3>
            <p className="mt-1 text-sm text-gray-600">Buat atau perbarui detail produk, varian, dan gambar sewa pakaian.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-bold hover:bg-gray-100 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <ProductImageUpload
                images={images}
                existingImages={activeExistingImages}
                maxImages={1}
                onChange={setImages}
                onRemoveExisting={(url) => setRemovedImageUrls([...removedImageUrls, url])}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4 border rounded-xl p-5 bg-white">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Informasi Produk</h3>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL) *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Deskripsi</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Kategori *</label>
                  <select
                    value={formData.dressing_room_category_id || ''}
                    onChange={(e) => setFormData({ ...formData, dressing_room_category_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
                  >
                    <option value="">Pilih Kategori</option>
                    <optgroup label="Dressing Room">
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-[#ff4b86] focus:ring-[#ff4b86] w-4 h-4"
                    />
                    <span className="text-sm font-bold text-gray-700">Aktif</span>
                  </label>
                </div>
              </div>

              <div className="border rounded-xl bg-white flex flex-col h-full overflow-hidden">
                 <DressingRoomProductVariantsSection
                   variants={variants}
                   setVariants={setVariants}
                 />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 px-6 py-5">
          <p className="text-xs text-gray-600">Menyimpan akan menerapkan perubahan pada produk, varian, dan gambar.</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-bold hover:bg-gray-100 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveMutation.isPending}
              className="rounded-lg bg-[#ff4b86] px-5 py-2 text-sm font-bold text-white hover:bg-[#e63d75] disabled:opacity-50 flex items-center gap-2"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
