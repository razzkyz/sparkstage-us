import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Clock, User, Phone, Mail, ArrowRight, FileText, RefreshCw, ShoppingBag, Plus, CheckCircle, Package, Download, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/formatters';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { uploadFileToImageKit } from '../../lib/imagekit';
import { RentalItemStatusTracker } from '../../components/admin/RentalItemStatusTracker';
import { CreateRentalOrderModal } from '../../components/admin/CreateRentalOrderModal';
import { DRReturnModal } from '../../components/admin/DRReturnModal';
import { RentalExcelImportModal } from '../../components/admin/RentalExcelImportModal';
import { exportRentalOrdersToExcel } from '../../utils/rentalExcelUtils';
import type { RentalItemStatus } from '../../types/dressingRoom';

type RentalOrderStatus = 'awaiting_payment' | 'paid' | 'active' | 'overdue' | 'returned' | 'cancelled' | 'refunded';
type PageTab = 'sewa_formal' | 'costume_harian' | 'dr_rental';
type CostumeReturnStatus = 'in_laundry' | 'returned' | null;

interface RentalOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string | null;
  start_time: string;
  end_time: string;
  duration_days: number;
  total_rental_cost: number;
  total_deposit: number;
  total_amount: number;
  status: RentalOrderStatus;
  payment_status: string;
  return_time: string | null;
  late_fee_amount: number;
  damage_fee_amount: number;
  refund_amount: number | null;
  refund_processed: boolean;
  payment_url: string | null;
  payment_expired_at: string | null;
  created_at: string;
}

interface RentalOrderItem {
  id: number;
  product_name: string;
  quantity: number;
  daily_rate: number;
  item_deposit_amount: number;
  total_rental_cost: number;
  initial_condition: Record<string, unknown>;
  return_condition: Record<string, unknown>;
  current_status?: RentalItemStatus;
}

interface DressingRoomOrderItem {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product_variant_id: number;
  product_variants: {
    name?: string;
    products?: { name?: string; categories?: { name?: string } | null } | null;
  } | null;
}

interface DressingRoomOrder {
  id: number;
  order_number: string;
  pickup_code: string | null;
  pickup_status: string | null;
  costume_return_status: CostumeReturnStatus;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  total: number;
  profiles: { name?: string; email?: string } | null;
  order_product_items: DressingRoomOrderItem[];
}

function damageDeduction(condition: string): number {
  if (condition === 'severely_damaged') return 50000;
  if (['stained', 'button_missing', 'damaged'].includes(condition)) return 10000;
  return 0;
}

function lateFeeCalc(endIso: string, returnIso: string): number {
  const diff = new Date(returnIso).getTime() - new Date(endIso).getTime();
  return diff > 0 ? Math.ceil(diff / 86400000) * 50000 : 0;
}

export default function RentalOrders() {
  const { signOut, getValidAccessToken } = useAuth();
  const menuSections = useAdminMenuSections();
  // Page-level tab
  const [activePageTab, setActivePageTab] = useState<PageTab>('costume_harian');
  const [showImportModal, setShowImportModal] = useState(false);
  // Sewa Formal state
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<RentalOrder | null>(null);
  const [orderItems, setOrderItems] = useState<RentalOrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RentalOrderStatus | 'all'>('all');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [customerFormErrors, setCustomerFormErrors] = useState<Record<string, string>>({});
  // Costume Harian state
  const [dressingRoomOrders, setDressingRoomOrders] = useState<DressingRoomOrder[]>([]);
  const [dressingRoomLoading, setDressingRoomLoading] = useState(false);
  const [costumeActionLoading, setCostumeActionLoading] = useState<number | null>(null);
  // Create Order modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);
  // DR Rental tab state
  const [drRentalOrders, setDrRentalOrders] = useState<RentalOrder[]>([]);
  const [drRentalLoading, setDrRentalLoading] = useState(false);
  const [selectedDrOrder, setSelectedDrOrder] = useState<RentalOrder | null>(null);
  const [drOrderItems, setDrOrderItems] = useState<RentalOrderItem[]>([]);
  const [showDrReturnModal, setShowDrReturnModal] = useState(false);
  const [showDrRefundModal, setShowDrRefundModal] = useState(false);
  const [drSearchQuery, setDrSearchQuery] = useState('');
  const [drStatusFilter, setDrStatusFilter] = useState<RentalOrderStatus | 'all'>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (activePageTab === 'costume_harian') fetchDressingRoomOrders();
    if (activePageTab === 'dr_rental') fetchDRRentalOrders();
  }, [activePageTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rental_orders')
        .select('*')
        .eq('source', 'formal')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('rental_order_items')
        .select('*')
        .eq('rental_order_id', orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error('Failed to fetch order items:', error);
    }
  };

  const handleOrderClick = (order: RentalOrder) => {
    setSelectedOrder(order);
    setCustomerFormData({
      fullName: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      address: order.customer_address || '',
    });
    setIsEditingCustomer(false);
    fetchOrderItems(order.id);
  };

  const handleReturn = async (
    returnTime: Date,
    conditions: Record<number, string>,
    itemStatuses: Record<number, string>,
    rejectPhotos: Record<number, File>
  ) => {
    if (!selectedOrder) return;

    try {
      // Calculate late fee (Rp 50.000 per day overdue)
      const lateFee = lateFeeCalc(selectedOrder.end_time, returnTime.toISOString());

      // Update order
      const { error: orderError } = await supabase
        .from('rental_orders')
        .update({
          return_time: returnTime.toISOString(),
          late_fee_amount: lateFee,
          status: 'returned',
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      // Upload reject photos to ImageKit
      const uploadedUrls: Record<number, string> = {};
      const accessToken = await getValidAccessToken();
      
      for (const [itemIdStr, file] of Object.entries(rejectPhotos)) {
         if (accessToken) {
             const result = await uploadFileToImageKit({
                 accessToken,
                 file,
                 fileName: `reject-${itemIdStr}-${Date.now()}`,
                 folderPath: `/public/dressing-room/rejects/${selectedOrder.id}`
             });
             uploadedUrls[parseInt(itemIdStr)] = result.image_url;
         }
      }

      // Update items with conditions, item_status, and reject_photo_url
      for (const [itemIdStr, condition] of Object.entries(conditions)) {
        const itemId = parseInt(itemIdStr);
        await supabase
          .from('rental_order_items')
          .update({
            return_condition: { condition },
            item_status: itemStatuses[itemId] || 'returned',
            reject_photo_url: uploadedUrls[itemId] || null
          })
          .eq('id', itemId);
      }

      // Calculate total damage deduction
      const totalDamageDeduction = Object.values(conditions).reduce(
        (sum, cond) => sum + damageDeduction(cond),
        0
      );

      // Update order with damage deduction
      await supabase
        .from('rental_orders')
        .update({
          damage_fee_amount: totalDamageDeduction,
        })
        .eq('id', selectedOrder.id);

      setShowReturnModal(false);
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('Failed to process return:', error);
      alert('Gagal memproses pengembalian');
    }
  };

  const handleRefund = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from('rental_orders')
        .update({
          refund_processed: true,
          refund_amount: selectedOrder.total_deposit - selectedOrder.late_fee_amount - selectedOrder.damage_fee_amount,
          status: 'refunded',
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      setShowRefundModal(false);
      fetchOrders();
      setSelectedOrder(null);
    } catch (error) {
      console.error('Failed to process refund:', error);
      alert('Gagal memproses refund');
    }
  };

  // ── Costume Harian handlers ──────────────────────────────────────────────

  const fetchDressingRoomOrders = useCallback(async () => {
    setDressingRoomLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_products')
        .select(`
          id, order_number, pickup_code, pickup_status, costume_return_status,
          paid_at, created_at, updated_at, total,
          profiles(name, email),
          order_product_items(
            id, quantity, price, subtotal, product_variant_id,
            product_variants(name, products(name, categories(name)))
          )
        `)
        .not('paid_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Filter orders to only include those that have at least one product from the Dressing Room category
      const filtered = (data || []).filter((order: any) => {
        return order.order_product_items?.some((item: any) => {
          const catName = item.product_variants?.products?.categories?.name;
          return catName && catName.toLowerCase() === 'dressing room';
        });
      });
      setDressingRoomOrders(filtered as DressingRoomOrder[]);
    } catch (err) {
      console.error('Failed to fetch dressing room orders:', err);
    } finally {
      setDressingRoomLoading(false);
    }
  }, []);

  const fetchDRRentalOrders = async () => {
    setDrRentalLoading(true);
    try {
      // Fetch rental_orders that have at least one item with dressing_room_product_variant_id
      const { data: itemsWithDR } = await supabase
        .from('rental_order_items')
        .select('rental_order_id')
        .not('dressing_room_product_variant_id', 'is', null);

      const drOrderIds = [...new Set((itemsWithDR || []).map((i: any) => i.rental_order_id))];
      if (drOrderIds.length === 0) { setDrRentalOrders([]); setDrRentalLoading(false); return; }

      const { data, error } = await supabase
        .from('rental_orders')
        .select('*')
        .in('id', drOrderIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrRentalOrders(data || []);
    } catch (err) {
      console.error('Failed to fetch DR rental orders:', err);
    } finally {
      setDrRentalLoading(false);
    }
  };

  const fetchDrOrderItems = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('rental_order_items')
        .select('*')
        .eq('rental_order_id', orderId);
      if (error) throw error;
      setDrOrderItems(data || []);
    } catch (err) {
      console.error('Failed to fetch DR order items:', err);
    }
  };

  const handleDrOrderClick = (order: RentalOrder) => {
    setSelectedDrOrder(order);
    setShowDrReturnModal(false);
    setShowDrRefundModal(false);
    fetchDrOrderItems(order.id);
  };

  const handleDRReturn = async (
    returnTime: Date,
    conditions: Record<number, string>,
    itemStatuses: Record<number, string>,
    rejectPhotos: Record<number, File>
  ) => {
    if (!selectedDrOrder) return;
    try {
      const lateFee = lateFeeCalc(selectedDrOrder.end_time, returnTime.toISOString());

      // Update order
      const { error: orderErr } = await supabase
        .from('rental_orders')
        .update({ return_time: returnTime.toISOString(), late_fee_amount: lateFee, status: 'returned' })
        .eq('id', selectedDrOrder.id);
      if (orderErr) throw orderErr;

      // Upload reject photos to ImageKit
      const uploadedUrls: Record<number, string> = {};
      const accessToken = await getValidAccessToken();
      for (const [itemIdStr, file] of Object.entries(rejectPhotos)) {
        if (accessToken) {
          const result = await uploadFileToImageKit({
            accessToken, file,
            fileName: `dr-reject-${itemIdStr}-${Date.now()}`,
            folderPath: `/public/dressing-room/rejects/${selectedDrOrder.id}`
          });
          uploadedUrls[parseInt(itemIdStr)] = result.image_url;
        }
      }

      // Update each item + restore DR inventory
      let totalDamage = 0;
      for (const item of drOrderItems) {
        const status = itemStatuses[item.id] || 'returned';
        const cond = conditions[item.id] || 'normal';
        const deduction = damageDeduction(cond);
        totalDamage += deduction;

        await supabase.from('rental_order_items').update({
          return_condition: { condition: cond },
          item_status: status,
          current_status: status === 'laundry' ? 'in_laundry' : (status === 'rejected' ? 'damaged' : 'returned'),
          reject_photo_url: uploadedUrls[item.id] || null,
          status_updated_at: new Date().toISOString(),
        }).eq('id', item.id);

        // Update DR variant inventory using the RPC
        const variantId = (item as any).dressing_room_product_variant_id;
        if (variantId) {
          if (status === 'returned') {
            await supabase.rpc('update_dressing_room_variant_inventory', {
              p_variant_id: variantId,
              p_available_qty: null, // We'll do +1 via direct update
              p_reserved_qty: null,
              p_damaged_qty: null,
              p_in_laundry_qty: null,
              p_total_qty: null,
            });
            // Increment available_quantity
            await supabase.rpc('increment_dr_variant_available', { p_variant_id: variantId, p_qty: item.quantity });
          } else if (status === 'laundry') {
            await supabase.rpc('increment_dr_variant_laundry', { p_variant_id: variantId, p_qty: item.quantity });
          } else if (status === 'rejected') {
            await supabase.rpc('increment_dr_variant_damaged', { p_variant_id: variantId, p_qty: item.quantity });
          }
        }
      }

      await supabase.from('rental_orders').update({ damage_fee_amount: totalDamage }).eq('id', selectedDrOrder.id);

      setShowDrReturnModal(false);
      fetchDRRentalOrders();
      setSelectedDrOrder(null);
    } catch (err) {
      console.error('Failed to process DR return:', err);
      alert('Gagal memproses pengembalian. Cek console.');
    }
  };

  const handleDRRefund = async () => {
    if (!selectedDrOrder) return;
    try {
      const { error } = await supabase.from('rental_orders').update({
        refund_processed: true,
        refund_amount: selectedDrOrder.total_deposit - selectedDrOrder.late_fee_amount - selectedDrOrder.damage_fee_amount,
        status: 'refunded',
      }).eq('id', selectedDrOrder.id);
      if (error) throw error;
      setShowDrRefundModal(false);
      fetchDRRentalOrders();
      setSelectedDrOrder(null);
    } catch (err) {
      console.error('Failed to process DR refund:', err);
      alert('Gagal memproses refund.');
    }
  };

  const handleSendLaundry = async (orderId: number) => {
    setCostumeActionLoading(orderId);
    try {
      const { error } = await supabase
        .from('order_products')
        .update({ costume_return_status: 'in_laundry' })
        .eq('id', orderId);
      if (error) throw error;
      setDressingRoomOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, costume_return_status: 'in_laundry' } : o))
      );
    } catch (err) {
      console.error('Failed to send to laundry:', err);
      alert('Gagal mengupdate status laundry');
    } finally {
      setCostumeActionLoading(null);
    }
  };

  const handleReturnStock = async (orderId: number) => {
    if (!window.confirm('Konfirmasi pengembalian stok costume? Stok akan ditambahkan kembali sesuai jumlah item order ini.')) return;
    setCostumeActionLoading(orderId);
    try {
      const { error } = await supabase.rpc('admin_return_costume_stock', { p_order_id: orderId });
      if (error) throw error;
      setDressingRoomOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, costume_return_status: 'returned' } : o))
      );
    } catch (err) {
      console.error('Failed to return stock:', err);
      alert('Gagal mengembalikan stok. Periksa console untuk detail.');
    } finally {
      setCostumeActionLoading(null);
    }
  };

  const validateCustomerForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerFormData.fullName.trim()) newErrors.fullName = 'Nama lengkap wajib diisi';
    if (!customerFormData.email.trim()) newErrors.email = 'Email wajib diisi';
    if (!customerFormData.email.includes('@')) newErrors.email = 'Email tidak valid';
    if (!customerFormData.phone.trim()) newErrors.phone = 'No HP wajib diisi';
    if (!customerFormData.phone.startsWith('08')) newErrors.phone = 'No HP harus dimulai dengan 08';
    if (!customerFormData.address.trim()) newErrors.address = 'Alamat wajib diisi';

    setCustomerFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveCustomerInfo = async () => {
    if (!selectedOrder || !validateCustomerForm()) return;

    try {
      const { error } = await supabase
        .from('rental_orders')
        .update({
          customer_name: customerFormData.fullName,
          customer_email: customerFormData.email,
          customer_phone: customerFormData.phone,
          customer_address: customerFormData.address,
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Update local state
      setSelectedOrder({
        ...selectedOrder,
        customer_name: customerFormData.fullName,
        customer_email: customerFormData.email,
        customer_phone: customerFormData.phone,
        customer_address: customerFormData.address,
      });

      setIsEditingCustomer(false);
      alert('Data customer berhasil diperbarui');
      fetchOrders();
    } catch (error) {
      console.error('Failed to save customer info:', error);
      alert('Gagal menyimpan data customer');
    }
  };

  const handleCustomerFieldChange = (field: string, value: string) => {
    setCustomerFormData(prev => ({ ...prev, [field]: value }));
    if (customerFormErrors[field]) {
      setCustomerFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStatusColor = (status: RentalOrderStatus) => {
    switch (status) {
      case 'awaiting_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'returned':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'refunded':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: RentalOrderStatus) => {
    switch (status) {
      case 'awaiting_payment':
        return 'Menunggu Pembayaran';
      case 'paid':
        return 'Sudah Bayar';
      case 'active':
        return 'Disewa';
      case 'overdue':
        return 'Telat';
      case 'returned':
        return 'Dikembalikan';
      case 'cancelled':
        return 'Dibatalkan';
      case 'refunded':
        return 'Refund';
      default:
        return status;
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={menuSections}
        defaultActiveMenuId="rental-orders"
        title="Sewa Dressing Room"
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
      defaultActiveMenuId="rental-orders"
      title="Sewa Dressing Room"
      onLogout={signOut}
    >
      <div className="space-y-6">

      {/* ── Page-level Tab Switcher ── */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActivePageTab('sewa_formal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activePageTab === 'sewa_formal'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Sewa Formal
        </button>
        <button
          onClick={() => setActivePageTab('costume_harian')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activePageTab === 'costume_harian'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Costume Harian
        </button>
        <button
          onClick={() => setActivePageTab('dr_rental')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activePageTab === 'dr_rental'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4" />
          DR Rental
        </button>
      </div>

      {/* ══ SEWA FORMAL TAB ══ */}
      {activePageTab === 'sewa_formal' && (<>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sewa Dressing Room</h1>
          <p className="text-sm text-gray-600 mt-1">Kelola pesanan sewa baju dan proses pengembalian</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportRentalOrdersToExcel(filteredOrders, 'sewa-formal')}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Order Baru
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-main-600 text-white rounded-lg hover:bg-main-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Success toast */}
      {createSuccessMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
        >
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Order berhasil dibuat!</p>
            <p className="text-xs text-green-700">{createSuccessMsg}</p>
          </div>
          <button
            onClick={() => setCreateSuccessMsg(null)}
            className="text-green-500 hover:text-green-700 text-lg leading-none"
          >✕</button>
        </motion.div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Sistem Sewa Baju – Flow & Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-semibold mb-1">💰 Harga Sewa:</p>
            <p>• Per item / per hari (15rb/hari)</p>
            <p>• Deposit: 75% dari harga produk</p>
          </div>
          <div>
            <p className="font-semibold mb-1">⏰ Denda Telat:</p>
            <p>• 5rb per jam</p>
            <p>• Bernoda: 10rb</p>
            <p>• Kancing copot: 10rb</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor order, nama, atau no HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RentalOrderStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
        >
          <option value="all">Semua Status</option>
          <option value="awaiting_payment">Menunggu Pembayaran</option>
          <option value="paid">Sudah Bayar</option>
          <option value="active">Aktif</option>
          <option value="overdue">Telat</option>
          <option value="returned">Dikembalikan</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="refunded">Refund</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Waktu</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOrderClick(order)}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900">{order.order_number}</div>
                  <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('id-ID')}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{order.customer_name}</div>
                  <div className="text-xs text-gray-500">{order.customer_phone}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.start_time).toLocaleDateString('id-ID')}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    {order.duration_days} hari
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {formatCurrency(order.total_amount)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderClick(order);
                    }}
                    className="text-main-600 hover:text-main-700"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedOrder.order_number}</h2>
                  <p className="text-sm text-gray-600">{selectedOrder.customer_name}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info - with Edit Form */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">👤 Informasi Customer</h3>
                  <button
                    onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      isEditingCustomer
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-main-100 text-main-700 hover:bg-main-200'
                    }`}
                  >
                    {isEditingCustomer ? 'Batal Edit' : 'Edit'}
                  </button>
                </div>

                {isEditingCustomer ? (
                  // Edit Form
                  <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={customerFormData.fullName}
                        onChange={(e) => handleCustomerFieldChange('fullName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                          customerFormErrors.fullName
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-main-500'
                        }`}
                      />
                      {customerFormErrors.fullName && (
                        <p className="text-xs text-red-600 mt-1">{customerFormErrors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={customerFormData.email}
                        onChange={(e) => handleCustomerFieldChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                          customerFormErrors.email
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-main-500'
                        }`}
                      />
                      {customerFormErrors.email && (
                        <p className="text-xs text-red-600 mt-1">{customerFormErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        No HP / WhatsApp
                      </label>
                      <input
                        type="tel"
                        placeholder="62812xxxxx"
                        value={customerFormData.phone}
                        onChange={(e) => handleCustomerFieldChange('phone', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                          customerFormErrors.phone
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-main-500'
                        }`}
                      />
                      {customerFormErrors.phone && (
                        <p className="text-xs text-red-600 mt-1">{customerFormErrors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Alamat Pengiriman
                      </label>
                      <textarea
                        value={customerFormData.address}
                        onChange={(e) => handleCustomerFieldChange('address', e.target.value)}
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                          customerFormErrors.address
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-main-500'
                        }`}
                      />
                      {customerFormErrors.address && (
                        <p className="text-xs text-red-600 mt-1">{customerFormErrors.address}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveCustomerInfo}
                        className="flex-1 px-3 py-2 bg-main-600 text-white rounded-lg text-sm font-medium hover:bg-main-700 transition-colors"
                      >
                        💾 Simpan
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingCustomer(false);
                          setCustomerFormErrors({});
                        }}
                        className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{selectedOrder.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{selectedOrder.customer_phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{selectedOrder.customer_email}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Mulai: {new Date(selectedOrder.start_time).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Kembali: {new Date(selectedOrder.end_time).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4" />
                        <span>Durasi: {selectedOrder.duration_days} hari</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Items with Status Tracker */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Item yang Disewa</h3>
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-xs text-gray-600">Qty: {item.quantity} x {formatCurrency(item.daily_rate)}/hari</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(item.total_rental_cost)}</p>
                          <p className="text-xs text-gray-600">Deposit: {formatCurrency(item.item_deposit_amount)}</p>
                        </div>
                      </div>
                      {item.current_status && (
                        <RentalItemStatusTracker
                          rentalOrderItemId={item.id}
                          itemName={item.product_name}
                          currentStatus={item.current_status}
                          onStatusUpdated={() => fetchOrderItems(selectedOrder!.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(selectedOrder.total_rental_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Deposit</span>
                  <span className="font-semibold">{formatCurrency(selectedOrder.total_deposit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Bayar</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Return/Refund Info */}
              {selectedOrder.status === 'returned' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">Info Pengembalian</h3>
                  <div className="space-y-2 text-sm text-yellow-800">
                    <div className="flex justify-between">
                      <span>Waktu Kembali:</span>
                      <span className="font-semibold">
                        {selectedOrder.return_time ? new Date(selectedOrder.return_time).toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Denda Telat:</span>
                      <span className="font-semibold">{formatCurrency(selectedOrder.late_fee_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Potongan Kerusakan:</span>
                      <span className="font-semibold">{formatCurrency(selectedOrder.damage_fee_amount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-yellow-300 pt-2">
                      <span className="font-semibold">Refund:</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(selectedOrder.refund_amount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {selectedOrder.status === 'awaiting_payment' && selectedOrder.payment_url ? (
                  <a
                    href={selectedOrder.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-center"
                  >
                    Link Pembayaran
                  </a>
                ) : null}
                {selectedOrder.status === 'paid' ? (
                  <button
                    onClick={() => {
                      supabase
                        .from('rental_orders')
                        .update({ status: 'active' })
                        .eq('id', selectedOrder.id)
                        .then(() => {
                          fetchOrders();
                          setSelectedOrder(null);
                        });
                    }}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Mulai Sewa
                  </button>
                ) : null}
                {selectedOrder.status === 'active' || selectedOrder.status === 'overdue' ? (
                  <button
                    onClick={() => setShowReturnModal(true)}
                    className="flex-1 px-4 py-3 bg-main-600 text-white rounded-lg hover:bg-main-700 transition-colors font-semibold"
                  >
                    Proses Pengembalian
                  </button>
                ) : null}
                {selectedOrder.status === 'returned' && !selectedOrder.refund_processed ? (
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Proses Refund
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedOrder && (
        <ReturnModal
          order={selectedOrder}
          items={orderItems}
          onClose={() => setShowReturnModal(false)}
          onSubmit={handleReturn}
        />
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedOrder && (
        <RefundModal
          order={selectedOrder}
          onClose={() => setShowRefundModal(false)}
          onSubmit={handleRefund}
        />
      )}
      </> )/* end sewa_formal */}

      {/* ══ DR RENTAL TAB ══ */}
      {activePageTab === 'dr_rental' && (
        <DRRentalSection
          orders={drRentalOrders}
          loading={drRentalLoading}
          searchQuery={drSearchQuery}
          statusFilter={drStatusFilter}
          onSearchChange={setDrSearchQuery}
          onStatusFilterChange={setDrStatusFilter}
          onOrderClick={handleDrOrderClick}
          onRefresh={fetchDRRentalOrders}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}

      {/* DR Order Detail Modal */}
      {selectedDrOrder && activePageTab === 'dr_rental' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDrOrder(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedDrOrder.order_number}</h2>
                <p className="text-sm text-gray-500">{selectedDrOrder.customer_name} · {selectedDrOrder.customer_phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedDrOrder.status)}`}>
                  {getStatusLabel(selectedDrOrder.status)}
                </span>
                <button onClick={() => setSelectedDrOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Timing */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Mulai Sewa</p>
                  <p className="font-semibold">{new Date(selectedDrOrder.start_time).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Batas Kembali</p>
                  <p className="font-semibold">{new Date(selectedDrOrder.end_time).toLocaleString('id-ID')}</p>
                </div>
              </div>
              {/* Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Item yang Disewa</h3>
                <div className="space-y-2">
                  {drOrderItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-500">{item.quantity}× @ {formatCurrency(item.daily_rate)}/hari</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(item.total_rental_cost)}</p>
                        {item.current_status && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.current_status === 'rented' ? 'bg-green-100 text-green-700'
                            : item.current_status === 'returned' ? 'bg-purple-100 text-purple-700'
                            : item.current_status === 'in_laundry' ? 'bg-blue-100 text-blue-700'
                            : item.current_status === 'damaged' ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}>{item.current_status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Summary */}
              <div className="bg-gradient-to-br from-main-50 to-pink-50 rounded-xl p-4 border border-main-100 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Biaya Sewa</span><span className="font-semibold">{formatCurrency(selectedDrOrder.total_rental_cost)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Total Deposit</span><span className="font-semibold text-yellow-700">{formatCurrency(selectedDrOrder.total_deposit)}</span></div>
                {selectedDrOrder.late_fee_amount > 0 && <div className="flex justify-between text-sm"><span className="text-red-600">Denda Telat</span><span className="font-semibold text-red-700">- {formatCurrency(selectedDrOrder.late_fee_amount)}</span></div>}
                {selectedDrOrder.damage_fee_amount > 0 && <div className="flex justify-between text-sm"><span className="text-red-600">Denda Kerusakan</span><span className="font-semibold text-red-700">- {formatCurrency(selectedDrOrder.damage_fee_amount)}</span></div>}
                <div className="border-t border-main-200 pt-2 flex justify-between"><span className="font-black text-gray-900">Total Bayar</span><span className="text-lg font-black text-main-600">{formatCurrency(selectedDrOrder.total_amount)}</span></div>
              </div>
              {/* Return info */}
              {selectedDrOrder.status === 'returned' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2 text-sm">
                  <p className="font-semibold text-yellow-900">Info Pengembalian</p>
                  <div className="flex justify-between"><span>Waktu Kembali</span><span className="font-semibold">{selectedDrOrder.return_time ? new Date(selectedDrOrder.return_time).toLocaleString('id-ID') : '-'}</span></div>
                  <div className="flex justify-between"><span>Denda Telat</span><span className="font-semibold">{formatCurrency(selectedDrOrder.late_fee_amount)}</span></div>
                  <div className="flex justify-between"><span>Denda Kerusakan</span><span className="font-semibold">{formatCurrency(selectedDrOrder.damage_fee_amount)}</span></div>
                  <div className="flex justify-between border-t border-yellow-300 pt-2"><span className="font-bold">Refund Deposit</span><span className="font-black text-green-700 text-base">{formatCurrency(Math.max(0, selectedDrOrder.total_deposit - selectedDrOrder.late_fee_amount - selectedDrOrder.damage_fee_amount))}</span></div>
                </div>
              )}
              {/* Actions */}
              <div className="flex gap-3">
                {(selectedDrOrder.status === 'active' || selectedDrOrder.status === 'overdue') && (
                  <button onClick={() => setShowDrReturnModal(true)} className="flex-1 py-3 bg-main-600 text-white rounded-xl font-bold hover:bg-main-700 transition-colors">Proses Pengembalian</button>
                )}
                {selectedDrOrder.status === 'paid' && (
                  <button onClick={async () => { await supabase.from('rental_orders').update({ status: 'active' }).eq('id', selectedDrOrder.id); fetchDRRentalOrders(); setSelectedDrOrder(null); }} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors">Konfirmasi Pengambilan</button>
                )}
                {selectedDrOrder.status === 'returned' && !selectedDrOrder.refund_processed && (
                  <button onClick={() => setShowDrRefundModal(true)} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors">Proses Refund Deposit</button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* DR Return Modal */}
      <DRReturnModal
        isOpen={showDrReturnModal && !!selectedDrOrder}
        order={selectedDrOrder}
        items={drOrderItems}
        onClose={() => setShowDrReturnModal(false)}
        onSubmit={handleDRReturn}
      />

      {/* DR Refund Modal */}
      {showDrRefundModal && selectedDrOrder && (
        <RefundModal
          order={selectedDrOrder}
          onClose={() => setShowDrRefundModal(false)}
          onSubmit={handleDRRefund}
        />
      )}

      {/* ══ COSTUME HARIAN TAB ══ */}
      {activePageTab === 'costume_harian' && (
        <CostumeHarianSection
          orders={dressingRoomOrders}
          loading={dressingRoomLoading}
          actionLoading={costumeActionLoading}
          onRefresh={fetchDressingRoomOrders}
          onSendLaundry={handleSendLaundry}
          onReturnStock={handleReturnStock}
        />
      )}

      </div>

      {/* Create Rental Order Modal */}
      {showCreateModal && (
        <CreateRentalOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(orderNumber) => {
            setShowCreateModal(false);
            setCreateSuccessMsg(`Order ${orderNumber} berhasil dibuat dan stok telah dikurangi.`);
            fetchOrders();
            setTimeout(() => setCreateSuccessMsg(null), 6000);
          }}
        />
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <RentalExcelImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={(count) => {
            setShowImportModal(false);
            setCreateSuccessMsg(`${count} order berhasil diimport dari Excel!`);
            fetchOrders();
            setTimeout(() => setCreateSuccessMsg(null), 6000);
          }}
        />
      )}
    </AdminLayout>
  );
}

// Return Modal Component
function ReturnModal({
  order,
  items,
  onClose,
  onSubmit,
}: {
  order: RentalOrder;
  items: RentalOrderItem[];
  onClose: () => void;
  onSubmit: (
    returnTime: Date,
    conditions: Record<number, string>,
    itemStatuses: Record<number, string>,
    rejectPhotos: Record<number, File>
  ) => void;
}) {
  const [returnTime, setReturnTime] = useState(new Date());
  const [conditions, setConditions] = useState<Record<number, string>>({});
  const [itemStatuses, setItemStatuses] = useState<Record<number, string>>({});
  const [rejectPhotos, setRejectPhotos] = useState<Record<number, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onSubmit(returnTime, conditions, itemStatuses, rejectPhotos);
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Proses Pengembalian</h2>
          <p className="text-sm text-gray-600">{order.order_number}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Return Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Waktu Kembali</label>
            <input
              type="datetime-local"
              value={returnTime.toISOString().slice(0, 16)}
              onChange={(e) => setReturnTime(new Date(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
            />
          </div>

          {/* Item Conditions */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Kondisi Item & Status Pengembalian</label>
            <div className="space-y-3">
              {items.map((item) => {
                const isRejected = itemStatuses[item.id] === 'rejected';
                return (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status Barang</label>
                        <select
                          value={itemStatuses[item.id] || 'returned'}
                          onChange={(e) => setItemStatuses({ ...itemStatuses, [item.id]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500 text-sm"
                        >
                          <option value="returned">Dikembalikan (Normal)</option>
                          <option value="laundry">Masuk Laundry</option>
                          <option value="rejected">Reject / Rusak</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Kondisi (Denda)</label>
                        <select
                          value={conditions[item.id] || 'normal'}
                          onChange={(e) => setConditions({ ...conditions, [item.id]: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500 text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="stained">Bernoda (-10rb)</option>
                          <option value="button_missing">Kancing Copot (-10rb)</option>
                          <option value="damaged">Rusak Ringan (-10rb)</option>
                          <option value="severely_damaged">Rusak Parah (Deposit Hangus)</option>
                        </select>
                      </div>
                    </div>

                    {isRejected && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <label className="block text-xs font-semibold text-red-900 mb-2">
                          Upload Foto Bukti Reject (Wajib)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setRejectPhotos({ ...rejectPhotos, [item.id]: file });
                            }
                          }}
                          className="block w-full text-sm text-red-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200"
                        />
                        {rejectPhotos[item.id] && (
                          <p className="mt-2 text-xs text-red-700 font-medium">✓ File terpilih: {rejectPhotos[item.id].name}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-main-600 text-white rounded-lg hover:bg-main-700 transition-colors font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Proses'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Refund Modal Component
function RefundModal({
  order,
  onClose,
  onSubmit,
}: {
  order: RentalOrder;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const refundAmount = order.total_deposit - order.late_fee_amount - order.damage_fee_amount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Proses Refund</h2>
          <p className="text-sm text-gray-600">{order.order_number}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Refund Amount */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-green-900 font-semibold">Total Refund</span>
              <span className="text-green-900 font-bold text-2xl">
                {formatCurrency(refundAmount)}
              </span>
            </div>
            <div className="mt-2 text-xs text-green-700">
              Deposit: {formatCurrency(order.total_deposit)} - Denda: {formatCurrency(order.late_fee_amount)} - Kerusakan: {formatCurrency(order.damage_fee_amount)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Konfirmasi Refund
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Costume Harian Section ──────────────────────────────────────────────────

type CostumeHarianSectionProps = {
  orders: DressingRoomOrder[];
  loading: boolean;
  actionLoading: number | null;
  onRefresh: () => void;
  onSendLaundry: (id: number) => void;
  onReturnStock: (id: number) => void;
};

function CostumeHarianSection({
  orders,
  loading,
  actionLoading,
  onRefresh,
  onSendLaundry,
  onReturnStock,
}: CostumeHarianSectionProps) {
  const [filter, setFilter] = useState<'all' | 'in_laundry' | 'returned' | 'pending'>('all');

  const filtered = orders.filter((o) => {
    if (filter === 'pending') return !o.costume_return_status;
    if (filter === 'in_laundry') return o.costume_return_status === 'in_laundry';
    if (filter === 'returned') return o.costume_return_status === 'returned';
    return true;
  });

  const pendingCount = orders.filter((o) => !o.costume_return_status).length;
  const laundryCount = orders.filter((o) => o.costume_return_status === 'in_laundry').length;
  const returnedCount = orders.filter((o) => o.costume_return_status === 'returned').length;

  const getStatusChip = (order: DressingRoomOrder) => {
    if (order.pickup_status !== 'completed') return { label: '⏳ Belum Selesai Sesi', cls: 'bg-gray-100 text-gray-800' };
    if (!order.costume_return_status) return { label: 'Selesai Sesi', cls: 'bg-yellow-100 text-yellow-800' };
    if (order.costume_return_status === 'in_laundry') return { label: '🧺 Sedang Laundry', cls: 'bg-blue-100 text-blue-800' };
    return { label: '✅ Stok Dikembalikan', cls: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Costume Harian</h1>
          <p className="text-sm text-gray-600 mt-1">
            Kelola pengembalian dan laundry costume dressing room per sesi
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-main-600 text-white rounded-lg hover:bg-main-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 text-sm text-pink-800">
        <p className="font-semibold mb-1">📋 Alur Pengembalian Costume Harian</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>1️⃣ Customer selesai sesi → pickup <strong>completed</strong></span>
          <span>2️⃣ Admin kirim ke laundry → klik <strong>Kirim Laundry</strong></span>
          <span>3️⃣ Costume bersih, cek fisik → klik <strong>Pengembalian Stok</strong> (stok otomatis +1)</span>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        {[
          { key: 'all', label: `Semua (${orders.length})` },
          { key: 'pending', label: `⏳ Belum Laundry (${pendingCount})` },
          { key: 'in_laundry', label: `🧺 Laundry (${laundryCount})` },
          { key: 'returned', label: `✅ Dikembalikan (${returnedCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filter === key
                ? 'bg-main-600 text-white border-main-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Tidak ada data costume harian</p>
          <p className="text-xs mt-1">
            {filter !== 'all' ? 'Coba ubah filter di atas' : 'Belum ada pesanan costume yang selesai sesi'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const chip = getStatusChip(order);
            const isLoading = actionLoading === order.id;

            return (
              <div
                key={order.id}
                className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm"
              >
                {/* Order header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{order.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {order.profiles?.name ?? order.profiles?.email ?? 'Customer'}
                    </p>
                    {order.paid_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Sesi: {new Date(order.paid_at).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${chip.cls}`}>
                      {chip.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(Number(order.total))}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="pl-2 border-l-2 border-gray-100 space-y-1">
                  {order.order_product_items.map((item) => {
                    const productName = item.product_variants?.products?.name ?? 'Product';
                    const variantName = item.product_variants?.name ?? '';
                    return (
                      <div key={item.id} className="flex justify-between text-xs text-gray-600">
                        <span>
                          <span className="font-medium text-gray-800">{productName}</span>
                          {variantName && <span className="text-gray-400"> · {variantName}</span>}
                        </span>
                        <span>{item.quantity}×</span>
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                {order.pickup_status === 'completed' && order.costume_return_status !== 'returned' && (
                  <div className="flex gap-2 pt-1">
                    {!order.costume_return_status && (
                      <>
                        <button
                          onClick={() => onReturnStock(order.id)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <span>✅</span>
                          )}
                          Kembalikan (Sesi 1-2)
                        </button>
                        <button
                          onClick={() => onSendLaundry(order.id)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <span>🧺</span>
                          )}
                          Kirim Laundry (Sesi 3)
                        </button>
                      </>
                    )}
                    {order.costume_return_status === 'in_laundry' && (
                      <button
                        onClick={() => onReturnStock(order.id)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <span>✅</span>
                        )}
                        Sudah Laundry (Kembalikan Stok)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DR Rental Section ────────────────────────────────────────────────────────

type DRRentalSectionProps = {
  orders: RentalOrder[];
  loading: boolean;
  searchQuery: string;
  statusFilter: RentalOrderStatus | 'all';
  onSearchChange: (v: string) => void;
  onStatusFilterChange: (v: RentalOrderStatus | 'all') => void;
  onOrderClick: (o: RentalOrder) => void;
  onRefresh: () => void;
  getStatusColor: (s: RentalOrderStatus) => string;
  getStatusLabel: (s: RentalOrderStatus) => string;
};

function DRRentalSection({
  orders,
  loading,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onOrderClick,
  onRefresh,
  getStatusColor,
  getStatusLabel,
}: DRRentalSectionProps) {
  const filtered = orders.filter((o) => {
    const matchSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone.includes(searchQuery);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DR Rental Orders</h1>
          <p className="text-sm text-gray-600 mt-1">
            Order sewa dari katalog Dressing Room — kelola pengembalian & refund deposit
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-main-600 text-white rounded-lg hover:bg-main-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800">
        <p className="font-semibold mb-1">📋 Alur DR Rental</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>1️⃣ Customer pesan online → status <strong>paid</strong></span>
          <span>2️⃣ Scan QR di halaman <strong>Scan &amp; Pickup</strong> → status <strong>active</strong></span>
          <span>3️⃣ Baju dikembalikan → klik <strong>Proses Pengembalian</strong></span>
          <span>4️⃣ Cek kondisi → <strong>Proses Refund Deposit</strong></span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor order, nama, atau no HP..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as RentalOrderStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-main-500"
        >
          <option value="all">Semua Status</option>
          <option value="awaiting_payment">Menunggu Pembayaran</option>
          <option value="paid">Siap Ambil</option>
          <option value="active">Disewa</option>
          <option value="overdue">Telat Kembalikan</option>
          <option value="returned">Dikembalikan</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="refunded">Refund</option>
        </select>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Belum ada order DR Rental</p>
          <p className="text-xs mt-1">
            {searchQuery || statusFilter !== 'all'
              ? 'Coba ubah filter pencarian'
              : 'Order akan muncul setelah customer memesan melalui halaman Dressing Room'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durasi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total / Deposit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onOrderClick(order)}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{order.order_number}</p>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('id-ID')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{order.duration_days} hari</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      s/d {new Date(order.end_time).toLocaleDateString('id-ID')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 text-sm">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-yellow-600">Deposit {formatCurrency(order.total_deposit)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOrderClick(order); }}
                      className="text-main-600 hover:text-main-700"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
