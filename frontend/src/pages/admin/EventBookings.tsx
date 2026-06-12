import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

type PurchasedTicketStatus = 'active' | 'used' | 'cancelled' | 'expired';

interface PurchasedTicket {
  id: number;
  ticket_id: number;
  ticket_code: string | null;
  ticket_name: string | null;
  user_id: string;
  valid_date: string;
  time_slot: string | null;
  queue_number: number | null;
  status: PurchasedTicketStatus;
  used_at: string | null;
  created_at: string;
  order_item_id: number | null;
}

export default function EventBookings() {
  const { signOut, isAdmin } = useAuth();
  const { showToast } = useToast();
  const menuSections = useAdminMenuSections();
  const [bookings, setBookings] = useState<PurchasedTicket[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<PurchasedTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeSlotFilter, setTimeSlotFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<PurchasedTicket | null>(null);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [newValidDate, setNewValidDate] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    fetchBookings();
  }, []);

  // Auto-refresh effect (every 10 seconds, silent)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookings(true); // silent refresh
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let allData: PurchasedTicket[] = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('purchased_tickets')
          .select('*')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allData = [...allData, ...(data as PurchasedTicket[])];
        if (!data || data.length < pageSize) break;
        page++;
      }

      setBookings(allData);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getStatusColor = (status: PurchasedTicketStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: PurchasedTicketStatus) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'used':
        return 'Used';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (booking.ticket_code?.toLowerCase().includes(q) ?? false) ||
      (booking.ticket_name?.toLowerCase().includes(q) ?? false) ||
      (booking.user_id?.toLowerCase().includes(q) ?? false);

    const matchesDate = !dateFilter || booking.valid_date === dateFilter;

    const matchesTimeSlot = !timeSlotFilter || booking.time_slot === timeSlotFilter;

    const matchesStatus = !statusFilter || booking.status === statusFilter;

    return matchesSearch && matchesDate && matchesTimeSlot && matchesStatus;
  });

  // Reset ke halaman 1 ketika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, timeSlotFilter, statusFilter]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  const stats = {
    total: bookings.length,
    active: bookings.filter(b => b.status === 'active').length,
    used: bookings.filter(b => b.status === 'used').length,
  };

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('success', `Kode "${text}" sudah di-copy!`);
    }).catch(() => {
      showToast('error', 'Gagal copy ke clipboard');
    });
  }, [showToast]);

  const handleReschedule = async () => {
    if (!rescheduleBooking) return;

    const dateChanged = newValidDate && newValidDate !== rescheduleBooking.valid_date;
    const slotChanged = newTimeSlot && newTimeSlot !== rescheduleBooking.time_slot;

    if (!dateChanged && !slotChanged) {
      showToast('error', 'Tidak ada perubahan untuk disimpan');
      return;
    }

    setRescheduling(true);
    try {
      const updates: Record<string, string> = {};
      if (dateChanged) updates.valid_date = newValidDate;
      if (slotChanged) updates.time_slot = newTimeSlot;

      console.log('Rescheduling ticket:', rescheduleBooking.id, updates);

      const { error } = await supabase
        .from('purchased_tickets')
        .update(updates)
        .eq('id', rescheduleBooking.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const parts: string[] = [];
      if (dateChanged) parts.push('tanggal');
      if (slotChanged) parts.push('sesi');
      showToast('success', `Jadwal ${parts.join(' & ')} berhasil diubah`);
      setRescheduleModalOpen(false);
      setRescheduleBooking(null);
      setNewTimeSlot('');
      setNewValidDate('');
      fetchBookings();
    } catch (error) {
      console.error('Failed to reschedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah jadwal';
      showToast('error', errorMessage);
    } finally {
      setRescheduling(false);
    }
  };

  const openRescheduleModal = (booking: PurchasedTicket) => {
    setRescheduleBooking(booking);
    setNewTimeSlot(booking.time_slot || '');
    setNewValidDate(booking.valid_date || '');
    setRescheduleModalOpen(true);
  };

  const closeRescheduleModal = () => {
    setRescheduleModalOpen(false);
    setRescheduleBooking(null);
    setNewTimeSlot('');
    setNewValidDate('');
  };

  if (loading) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="event-bookings"
        title="Event Bookings"
        onLogout={signOut}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-main-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="event-bookings"
      title="Event Bookings"
      onLogout={signOut}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Event Bookings</h1>
            <p className="text-sm text-gray-600 mt-1">Kelola pesanan tiket event</p>
          </div>
          <button
            onClick={() => fetchBookings()}
            className="flex items-center gap-2 px-4 py-2 bg-main-600 text-white rounded-lg hover:bg-main-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Total Tickets</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Used</p>
            <p className="text-2xl font-bold text-blue-600">{stats.used}</p>
          </div>
        </div>

        {/* Filter Results Info */}
        {(searchQuery || dateFilter || timeSlotFilter) && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-800">
              Filter aktif: menampilkan <span className="font-semibold">{filteredBookings.length}</span> dari <span className="font-semibold">{bookings.length}</span> booking
              {searchQuery && <span> (pencarian: "{searchQuery}")</span>}
              {dateFilter && <span> (tanggal: {dateFilter})</span>}
              {timeSlotFilter && <span> (sesi: {timeSlotFilter})</span>}
              {statusFilter && <span> (status: {statusFilter})</span>}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Cari ticket code, ticket name, atau user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
          />
          <select
            value={timeSlotFilter}
            onChange={(e) => setTimeSlotFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
          >
            <option value="">Semua Sesi</option>
            <option value="09:00:00">09:00</option>
            <option value="12:00:00">12:00</option>
            <option value="15:00:00">15:00</option>
            <option value="18:00:00">18:00</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
          >
            <option value="">Semua Status</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
          {(dateFilter || timeSlotFilter || statusFilter) && (
            <button
              onClick={() => {
                setDateFilter('');
                setTimeSlotFilter('');
                setStatusFilter('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Bookings Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ticket Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ticket Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valid Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time Slot</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nomor Antrian</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Used At</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedBookings.map((booking, index) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{startIndex + index + 1}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{booking.ticket_code || '-'}</span>
                        {booking.ticket_code && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(booking.ticket_code!);
                            }}
                            className="p-1 text-gray-400 hover:text-main-600 hover:bg-gray-100 rounded transition-colors"
                            title="Copy kode tiket"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{booking.ticket_name || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{new Date(booking.valid_date).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{booking.time_slot || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{booking.queue_number || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {booking.used_at ? new Date(booking.used_at).toLocaleString('id-ID') : '-'}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRescheduleModal(booking);
                          }}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                            booking.status === 'active'
                              ? 'bg-main-600 text-white hover:bg-main-700'
                              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          }`}
                          disabled={booking.status !== 'active'}
                          title={booking.status === 'active' ? 'Reschedule ticket' : `Cannot reschedule ${booking.status} ticket`}
                        >
                          Reschedule
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada booking yang ditemukan
            </div>
          ) : (
            <div className="border-t border-gray-200 px-4 py-4 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold">{startIndex + 1}</span> - <span className="font-semibold">{Math.min(endIndex, filteredBookings.length)}</span> dari <span className="font-semibold">{filteredBookings.length}</span> booking
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Halaman sebelumnya"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <div className="flex items-center gap-1">
                  {/* Show first page */}
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={() => setCurrentPage(1)}
                        className="px-3 py-1 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        1
                      </button>
                      {currentPage > 4 && <span className="px-2 text-gray-500">...</span>}
                    </>
                  )}
                  
                  {/* Show surrounding pages */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, currentPage - 2) + i;
                    return pageNum <= totalPages ? pageNum : null;
                  }).filter(Boolean).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-main-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {/* Show last page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="px-2 text-gray-500">...</span>}
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-1 rounded text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Halaman berikutnya"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Booking Detail Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Detail Booking</h2>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Ticket Code</p>
                    <p className="font-semibold text-gray-900">{selectedBooking.ticket_code || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ticket Name</p>
                    <p className="font-semibold text-gray-900">{selectedBooking.ticket_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="font-semibold text-gray-900">{selectedBooking.user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valid Date</p>
                    <p className="font-semibold text-gray-900">{new Date(selectedBooking.valid_date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time Slot</p>
                    <p className="font-semibold text-gray-900">{selectedBooking.time_slot || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nomor Antrian</p>
                    <p className="font-semibold text-gray-900">{selectedBooking.queue_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedBooking.status)}`}>
                      {getStatusLabel(selectedBooking.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Used At</p>
                    <p className="font-semibold text-gray-900">{selectedBooking.used_at ? new Date(selectedBooking.used_at).toLocaleString('id-ID') : 'Not used yet'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created At</p>
                    <p className="font-semibold text-gray-900">{new Date(selectedBooking.created_at).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {rescheduleModalOpen && rescheduleBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Reschedule Tiket</h2>
                  <button
                    onClick={closeRescheduleModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Ticket Code</p>
                    <p className="font-semibold text-gray-900">{rescheduleBooking.ticket_code || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ticket Name</p>
                    <p className="font-semibold text-gray-900">{rescheduleBooking.ticket_name || '-'}</p>
                  </div>

                  {/* Current schedule info */}
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-gray-500 mb-1">Jadwal Saat Ini</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(rescheduleBooking.valid_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      {rescheduleBooking.time_slot ? ` · ${rescheduleBooking.time_slot.slice(0, 5)}` : ''}
                    </p>
                  </div>

                  {/* New date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Baru</label>
                    <input
                      type="date"
                      value={newValidDate}
                      onChange={(e) => setNewValidDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
                    />
                  </div>

                  {/* New session */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sesi Baru</label>
                    <select
                      value={newTimeSlot}
                      onChange={(e) => setNewTimeSlot(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
                    >
                      <option value="">Pilih sesi</option>
                      <option value="09:00:00">09:00</option>
                      <option value="12:00:00">12:00</option>
                      <option value="15:00:00">15:00</option>
                      <option value="18:00:00">18:00</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={closeRescheduleModal}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleReschedule}
                      disabled={
                        rescheduling ||
                        (
                          (!newValidDate || newValidDate === rescheduleBooking.valid_date) &&
                          (!newTimeSlot || newTimeSlot === rescheduleBooking.time_slot)
                        )
                      }
                      className="flex-1 px-4 py-2 bg-main-600 text-white rounded-lg hover:bg-main-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rescheduling ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
