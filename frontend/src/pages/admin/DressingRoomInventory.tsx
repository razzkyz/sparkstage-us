import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import DressingRoomInventoryManager from '../../components/admin/DressingRoomInventoryManager';
import { useDressingRoomInventorySummary } from '../../hooks/useDressingRoomInventory';

export function DressingRoomInventory() {
  const { user, signOut } = useAuth();
  const menuSections = useAdminMenuSections();
  const [isAuthorized, setIsAuthorized] = useState(true);

  const { data: inventory, isLoading: inventoryLoading } = useDressingRoomInventorySummary();

  const totalStok = inventory?.reduce((sum, item) => sum + (item.total_quantity ?? 0), 0) ?? 0;
  const totalTersedia = inventory?.reduce((sum, item) => sum + (item.available_quantity ?? 0), 0) ?? 0;
  const totalDisewa = inventory?.reduce((sum, item) => sum + (item.reserved_quantity ?? 0), 0) ?? 0;
  const totalLaundry = inventory?.reduce((sum, item) => sum + (item.in_laundry_quantity ?? 0), 0) ?? 0;
  const totalDamaged = inventory?.reduce((sum, item) => sum + (item.damaged_quantity ?? 0), 0) ?? 0;

  useEffect(() => {
    if (!user) {
      setIsAuthorized(false);
    }
  }, [user]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="dressing-room-inventory"
      title="Dressing Room Inventory"
      subtitle="Kelola stok dan produk dressing room"
      onLogout={signOut}
    >
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Dressing room</p>
              <h1 className="text-3xl font-semibold text-slate-950 mt-2">Inventory Dashboard</h1>
              <p className="max-w-2xl text-sm text-slate-600 mt-3">
                Pantau stok, ketersediaan, laundry, dan kondisi produk dressing room dengan tampilan lebih bersih dan modern.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
              <span className="material-symbols-outlined text-base">history</span>
              Update setiap kali halaman dimuat
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-5">
          <InfoCard title="Total Stok" icon="inventory_2" accent="from-sky-500 to-cyan-500" value={inventoryLoading ? null : totalStok} />
          <InfoCard title="Tersedia" icon="check_circle" accent="from-emerald-500 to-teal-500" value={inventoryLoading ? null : totalTersedia} />
          <InfoCard title="Sedang Disewa" icon="shopping_bag" accent="from-amber-400 to-orange-500" value={inventoryLoading ? null : totalDisewa} />
          <InfoCard title="Dalam Laundry" icon="local_laundry_service" accent="from-violet-500 to-fuchsia-500" value={inventoryLoading ? null : totalLaundry} />
          <InfoCard title="Rusak" icon="report_problem" accent="from-rose-500 to-pink-500" value={inventoryLoading ? null : totalDamaged} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.8fr,0.9fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Daftar Produk</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Kelola inventory dressing room secara cepat dan jelas.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                <span className="material-symbols-outlined">speed</span>
                Fokus pada stok terpenting
              </div>
            </div>
            <div className="mt-6">
              <DressingRoomInventoryManager />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950 mb-3">Tips Cepat</h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li>• Gunakan filter untuk menemukan varian lebih cepat.</li>
                <li>• Perhatikan badge merah untuk stok rendah.</li>
                <li>• Simpan perubahan hanya setelah memastikan jumlah benar.</li>
              </ul>
            </div>
            <div className="rounded-[32px] border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Status Inventory</h3>
              <p className="text-sm text-blue-800">
                Total inventory mencakup unit tersedia, disewa, laundry, dan rusak. Jaga ketersediaan agar operasional tetap lancar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

interface InfoCardProps {
  title: string;
  icon: string;
  accent: string;
  value: number | null;
}

function InfoCard({ title, icon, accent, value }: InfoCardProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-br ${accent} p-5 text-white`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">{title}</p>
            <p className="mt-4 text-3xl font-semibold">{value === null ? '—' : value}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/20 text-2xl shadow-lg">
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 text-sm text-slate-600">Update terakhir saat halaman dimuat.</div>
    </div>
  );
}

export default DressingRoomInventory;
