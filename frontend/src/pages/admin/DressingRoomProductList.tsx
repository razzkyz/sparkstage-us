import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';
import { AlertCircle, Upload, Search, Download } from 'lucide-react';
import { ADMIN_MENU_ITEMS } from '@/constants/adminMenu';
import { useAdminMenuSections } from '@/hooks/useAdminMenuSections';
import { useAuth } from '@/contexts/AuthContext';
import { DressingRoomCSVImportModal, type DressingRoomProductDraft } from '@/components/admin/DressingRoomCSVImportModal';
import { DressingRoomProductModal } from '@/components/admin/DressingRoomProductModal';
import { DressingRoomProductCard } from './dressing-room/DressingRoomProductCard';
import TableRowSkeleton from '@/components/skeletons/TableRowSkeleton';
import { exportDressingRoomProductsToExcel } from '@/utils/dressingRoomExcelUtils';

function DressingRoomProductList() {
  const queryClient = useQueryClient();
  const menuSections = useAdminMenuSections();
  const { signOut } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Fetch products
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['dressing-room-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dressing_room_products')
        .select(`
          id,
          name,
          slug,
          description,
          category,
          image_url,
          is_active,
          created_at,
          dressing_room_product_variants(id, name, sku, size_label, color, price, daily_rental_fee, total_quantity, is_active)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Filter and sort products
  const filteredProducts = products?.filter((product: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return product.name.toLowerCase().includes(term) || product.slug.toLowerCase().includes(term);
  }).sort((a: any, b: any) => {
    if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
    return 0;
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      const { error } = await supabase
        .from('dressing_room_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dressing-room-products'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ productId, isActive }: { productId: number, isActive: boolean }) => {
      const { error } = await supabase
        .from('dressing_room_products')
        .update({ is_active: isActive })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dressing-room-products'] });
    },
  });

  const handleEdit = async (product: any) => {
    // Fetch full product data including variants for the modal
    const { data } = await supabase
      .from('dressing_room_products')
      .select('*, dressing_room_product_variants(*)')
      .eq('id', product.id)
      .single();
    
    setEditingProduct(data);
    setModalOpen(true);
  };

  const handleDelete = (product: any) => {
    if (window.confirm(`Hapus produk "${product.name}"?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const handleToggleActive = (productId: number, currentlyActive: boolean) => {
    toggleActiveMutation.mutate({ productId, isActive: !currentlyActive });
  };

  const handleImport = async (drafts: DressingRoomProductDraft[]) => {
    setIsImporting(true);
    try {
      for (const draft of drafts) {
        const { data: productData, error: productError } = await supabase
          .from('dressing_room_products')
          .insert({
            name: draft.name,
            slug: draft.slug,
            description: draft.description,
            category: draft.category,
            image_url: draft.image_url,
            is_active: draft.is_active,
          })
          .select()
          .single();

        if (productError) {
          console.error('Failed to import product:', productError);
          continue; 
        }

        for (const variant of draft.variants) {
          await supabase
            .from('dressing_room_product_variants')
            .insert({
              dressing_room_product_id: productData.id,
              name: variant.name,
              sku: variant.sku,
              size_label: variant.size_label,
              color: variant.color,
              price: variant.price,
              daily_rental_fee: variant.daily_rental_fee,
              total_quantity: variant.total_quantity,
              is_active: true,
            });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['dressing-room-products'] });
    } catch (err) {
      console.error('Error importing:', err);
    } finally {
      setIsImporting(false);
      setShowImportModal(false);
    }
  };

  if (error) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="dressing-room-products"
        title="Produk Dressing Room"
        onLogout={signOut}
      >
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error loading products</h3>
            <p className="text-sm text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="dressing-room-products"
      title="Produk Dressing Room"
      subtitle="Kelola katalog produk sewa pakaian"
      onLogout={signOut}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportDressingRoomProductsToExcel(products ?? [])}
            disabled={!products || products.length === 0}
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed sm:px-4"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-700 shadow-sm transition-colors hover:bg-amber-100 sm:px-4"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import Excel</span>
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setModalOpen(true); }}
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#ff4b86] px-3 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a] sm:px-4"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="sm:hidden">Tambah</span>
            <span className="hidden sm:inline">Tambah Produk</span>
          </button>
        </div>
      }
    >
      <section className="flex flex-col gap-6">
        {/* Search and Filter Toolbar */}
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#ff4b86]"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#ff4b86] sm:w-auto"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="name-asc">Nama (A-Z)</option>
              <option value="name-desc">Nama (Z-A)</option>
            </select>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="font-bold text-gray-900">{filteredProducts?.length || 0} items</div>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <tbody>
                <TableRowSkeleton columns={4} />
                <TableRowSkeleton columns={4} />
              </tbody>
            </table>
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: any) => (
              <DressingRoomProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada produk ditemukan</h3>
            <p className="text-sm text-gray-600 mb-6">Coba sesuaikan kata kunci pencarian Anda atau tambahkan produk baru.</p>
            <div className="flex justify-center gap-3">
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hapus Pencarian
                </button>
              )}
              <button 
                onClick={() => { setEditingProduct(null); setModalOpen(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a]"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Buat Produk Baru
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Product Modal */}
      <DressingRoomProductModal
        isOpen={modalOpen}
        initialValue={editingProduct}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setModalOpen(false)}
      />

      {/* Import CSV Modal */}
      <DressingRoomCSVImportModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        isImporting={isImporting}
      />
    </AdminLayout>
  );
}

export default DressingRoomProductList;
