import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import PurchasedTicketsTable from '../../components/admin/PurchasedTicketsTable';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { useTicketsManagement } from '../../hooks/useTicketsManagement';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';
import { useToast } from '../../components/Toast';

const ITEMS_PER_PAGE = 100;

const TicketsManagement = () => {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const menuSections = useAdminMenuSections();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('used');
  const [eventFilter, setEventFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { data, error, isLoading, isFetching, refetch } = useTicketsManagement();
  const tickets = data?.tickets ?? [];
  const stats = data?.stats ?? { totalValid: 0, entered: 0 };


  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load tickets');
    }
  }, [error, showToast]);

  const copyToClipboard = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      showToast('success', `Kode \"${code}\" sudah di-copy!`);
    }).catch(() => {
      showToast('error', 'Gagal copy ke clipboard');
    });
  }, [showToast]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      normalizedSearch === '' ||
      [ticket.qr_code, ticket.users.name, ticket.users.email, ticket.tickets.name]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(normalizedSearch));

    const matchesStatus =
      statusFilter === '' ||
      statusFilter === 'all' ||
      (statusFilter === 'used' && ticket.status === 'used') ||
      (statusFilter === 'active' && ticket.status === 'active') ||
      (statusFilter === 'cancelled' && ticket.status === 'cancelled');

    const matchesEvent = eventFilter === '' || eventFilter === 'all' || ticket.tickets.name.toLowerCase().includes(eventFilter);

    return matchesSearch && matchesStatus && matchesEvent;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, eventFilter]);

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="entrance-log"
      title="Log Tiket Masuk"
      onLogout={signOut}
    >
      {/* Info Banner with Refresh Button */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-600 flex-shrink-0">info</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-800 font-medium mb-1">
              Halaman ini menampilkan tiket yang sudah dipindai di pintu masuk
            </p>
            <p className="text-xs text-blue-700">
              Filter default menampilkan hanya tiket yang sudah dipindai. Data diperbarui secara otomatis saat ada perubahan.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-gray-900 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <span className={`material-symbols-outlined text-sm ${isFetching ? 'animate-spin' : ''}`}>
              {isFetching ? 'progress_activity' : 'refresh'}
            </span>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="material-symbols-outlined text-gray-600">search</span>
          </div>
          <input
            className="block w-full rounded-lg border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-500 focus:border-primary focus:ring-primary shadow-sm"
            placeholder="Cari berdasarkan ID Pesanan, Nama Pelanggan..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="block w-full rounded-lg border-gray-200 bg-white py-3 pl-3 pr-10 text-sm text-gray-900 focus:border-primary focus:ring-primary shadow-sm font-sans"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="used">Hanya yang Sudah Discan (Default)</option>
            <option value="all">Semua Tiket</option>
            <option value="active">Belum Discan</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <div className="relative">
          <select
            className="block w-full rounded-lg border-gray-200 bg-white py-3 pl-3 pr-10 text-sm text-gray-900 focus:border-primary focus:ring-primary shadow-sm font-sans"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="">Filter berdasarkan Event</option>
            <option value="all">Semua Event</option>
            <option value="gala">Annual Gala</option>
            <option value="workshop">Photo Workshop</option>
          </select>
        </div>
      </section>

      {/* Purchased Tickets Table */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {statusFilter === 'used' ? 'Tiket yang Sudah Discan' : 
             statusFilter === 'active' ? 'Tiket Belum Discan' : 
             'Semua Tiket'}
          </h3>
          <div className="text-sm text-gray-600">
            Menampilkan {paginatedTickets.length} dari {filteredTickets.length} tiket (Halaman {currentPage} dari {totalPages || 1})
          </div>
        </div>
        {isLoading ? (
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <tbody>
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
              </tbody>
            </table>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-400 mb-3 block">receipt</span>
            <p className="text-gray-600 font-medium">Tidak ada tiket yang sesuai dengan filter</p>
          </div>
        ) : (
          <>
            <PurchasedTicketsTable tickets={paginatedTickets} loading={false} stats={stats} onCopyTicket={copyToClipboard} />
            
            {/* Pagination Controls */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Total: {filteredTickets.length} tiket
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">navigate_before</span>
                  Sebelumnya
                </button>
                
                <div className="flex items-center gap-1">
                  {totalPages <= 5 ? (
                    Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))
                  ) : (
                    <>
                      {currentPage > 2 && (
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
                        >
                          1
                        </button>
                      )}
                      {currentPage > 3 && <span className="text-gray-600 px-2">...</span>}
                      {[currentPage - 1, currentPage, currentPage + 1]
                        .filter((p) => p > 1 && p < totalPages)
                        .map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      {currentPage < totalPages - 2 && <span className="text-gray-600 px-2">...</span>}
                      {currentPage < totalPages - 1 && (
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
                        >
                          {totalPages}
                        </button>
                      )}
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Berikutnya
                  <span className="material-symbols-outlined text-sm">navigate_next</span>
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </AdminLayout>
  );
};

export default TicketsManagement;
