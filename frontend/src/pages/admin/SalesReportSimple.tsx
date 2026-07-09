import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';

// ── Types ────────────────────────────────────────────────────────────────────

interface ProductOrderRow {
  id: number;
  order_number: string;
  total: number;
  payment_status: string | null;
  pickup_status: string | null;
  paid_at: string | null;
  created_at: string | null;
  profiles: { name?: string; email?: string } | null;
  order_product_items: {
    id: number;
    quantity: number;
    price: number;
    subtotal: number;
    product_variants?: {
      name?: string;
      products?: { name?: string } | null;
    } | null;
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useProductSales(enabled: boolean) {
  return useQuery({
    queryKey: ['sales-report-products'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_products')
        .select('id, order_number, total, payment_status, pickup_status, paid_at, created_at, profiles(name,email), order_product_items(id,quantity,price,subtotal,product_variants(name,products(name)))')
        .eq('payment_status', 'paid')
        .eq('pickup_status', 'completed')
        .order('paid_at', { ascending: false, nullsFirst: false })
        .limit(100);
      
      if (error) throw error;
      return (data ?? []) as unknown as ProductOrderRow[];
    },
  });
}

export default function SalesReportSimple() {
  const { signOut, session } = useAuth();
  const menuSections = useAdminMenuSections();
  const queryEnabled = !!session;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  const firstOfMonth = `${year}-${month}-01`;

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [productPage, setProductPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const { data: products = [], isLoading } = useProductSales(queryEnabled);

  // ── Client-side date filter ───────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to + 'T23:59:59').getTime();
    
    return products.filter(o => {
      const dateStr = o.paid_at || o.created_at;
      if (!dateStr) return false;
      const ms = new Date(dateStr).getTime();
      return ms >= fromMs && ms <= toMs;
    });
  }, [products, from, to]);

  // ── Pagination ───────────────────────────────────────────────────────
  const productPagination = useMemo(() => {
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const page = Math.max(1, Math.min(productPage, totalPages));
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      data: filteredProducts.slice(start, end),
      page,
      totalPages,
      total,
      start,
    };
  }, [filteredProducts, productPage, ITEMS_PER_PAGE]);

  // ── Stats ────────────────────────────────────────────────────────────
  const productStats = useMemo(() => {
    const orders = filteredProducts.length;
    const revenue = filteredProducts.reduce((s, o) => s + (o.total || 0), 0);
    const items = filteredProducts.reduce((s, o) => 
      s + o.order_product_items.reduce((ss, i) => ss + i.quantity, 0), 0
    );
    return { orders, revenue, items };
  }, [filteredProducts]);

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="sales-report"
      title="Sales Report - Products"
      onLogout={signOut}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Sales Report</h1>
          <p className="text-gray-600">View all completed product orders</p>
        </div>

        {/* ── Date Filter ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => {
                setFrom(firstOfMonth);
                setTo(today);
              }}
              className="mt-5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Reset to This Month
            </button>
          </div>
        </div>

        {/* ── Stats Summary ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Total Orders</div>
            <div className="text-2xl font-bold text-blue-900">{productStats.orders}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="text-xs font-semibold text-green-600 uppercase mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-green-900">{formatUSD(productStats.revenue)}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="text-xs font-semibold text-purple-600 uppercase mb-1">Items Sold</div>
            <div className="text-2xl font-bold text-purple-900">{productStats.items}</div>
          </div>
        </div>

        {/* ── Products Table ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">Product Orders</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['No', 'Order #', 'Customer', 'Email', 'Total', 'Status', 'Paid Date', 'Created'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : productPagination.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                      No orders found in this period
                    </td>
                  </tr>
                ) : (
                  productPagination.data.map((o, i) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs">{productPagination.start + i + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{o.order_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{o.profiles?.name ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{o.profiles?.email ?? '-'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{formatUSD(o.total)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          {o.pickup_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(o.paid_at)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(o.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────── */}
          {!isLoading && productPagination.data.length > 0 && (
            <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>
                  Showing <strong>{productPagination.start + 1}–{Math.min(productPagination.start + ITEMS_PER_PAGE, productPagination.total)}</strong> of <strong>{productPagination.total}</strong> orders
                </span>
                <span>·</span>
                <span className="font-bold text-gray-900">{formatUSD(productStats.revenue)}</span>
              </div>
              
              {productPagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProductPage(p => Math.max(1, p - 1))}
                    disabled={productPagination.page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {productPagination.page} of {productPagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => setProductPage(p => Math.min(productPagination.totalPages, p + 1))}
                    disabled={productPagination.page === productPagination.totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

