import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { useAdminMenuSections } from '../../hooks/useAdminMenuSections';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import * as XLSX from 'xlsx';

const TICKET_PRICE = 85_000;

// ── Types ────────────────────────────────────────────────────────────────────

interface TicketRow {
  id: number;
  ticket_code: string | null;
  valid_date: string;
  time_slot: string | null;
  status: string;
  created_at: string;
  used_at: string | null;
  tickets: { name: string } | null;
}

type TicketRowRaw = TicketRow & {
  tickets: { name: string }[] | { name: string } | null;
};

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

interface PrintOrderRow {
  id: number;
  doku_order_id: string | null;
  amount: number;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  queue_number: string | null;
}

interface SockRow {
  id: number;
  report_date: string;
  stock_awal: number;
  terjual: number;
  sisa: number;
  harga_per_pasang: number;
  total: number;
  catatan: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RentalOrderRow {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  duration_days: number;
  subtotal: number;
  deposit_amount: number;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  rental_order_items?: {
    id: number;
    product_name: string;
    quantity: number;
    daily_rate: number;
    item_deposit_amount: number;
    total_rental_cost: number;
  }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function formatDatetime(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function downloadXLSX(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows);
    // Auto-width
    if (sheet.rows.length > 0) {
      const cols = Object.keys(sheet.rows[0]);
      ws['!cols'] = cols.map(k => ({
        wch: Math.max(k.length + 2, ...sheet.rows.map(r => String(r[k] ?? '').length)) + 1,
      }));
    }
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, filename);
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useTicketSales(enabled: boolean) {
  return useQuery({
    queryKey: ['sales-report-tickets'],
    enabled,
    queryFn: async () => {
      let allData: TicketRowRaw[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('purchased_tickets')
          .select('id, ticket_code, valid_date, time_slot, status, created_at, used_at, tickets(name)')
          .eq('status', 'used')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allData = [...allData, ...((data ?? []) as TicketRowRaw[])];
        if (!data || data.length < pageSize) break;
        page++;
      }
      // Normalize tickets from array to object
      return allData.map(d => ({
        ...d,
        tickets: Array.isArray(d.tickets) ? d.tickets[0] : d.tickets,
      })) as TicketRow[];
    },
  });
}

function useProductSales(enabled: boolean) {
  return useQuery({
    queryKey: ['sales-report-products'],
    enabled,
    queryFn: async () => {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('order_products')
          .select('id, order_number, total, payment_status, pickup_status, paid_at, created_at, profiles(name,email), order_product_items(id,quantity,price,subtotal,product_variants(name,products(name)))')
          .eq('payment_status', 'paid')
          .eq('pickup_status', 'completed')
          .order('paid_at', { ascending: false, nullsFirst: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allData = [...allData, ...(data ?? [])];
        if (!data || data.length < pageSize) break;
        page++;
      }
      return allData as unknown as ProductOrderRow[];
    },
  });
}

function usePrintSales(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.printOrders(),
    enabled,
    queryFn: async () => {
      // First check: get count of ALL rows
      const { count, error: countError } = await supabase
        .from('print_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid');
      
      console.log('print_orders total rows in DB (status=paid):', count);
      if (countError) console.error('Count error:', countError);

      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('print_orders')
          .select('id, doku_order_id, amount, status, paid_at, created_at, customer_name, customer_email, queue_number')
          .eq('status', 'paid')
          .order('paid_at', { ascending: false, nullsFirst: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) {
          console.error('Print orders query error:', error);
          throw error;
        }
        
        console.log(`Print page ${page}:`, data?.length ?? 0, 'items');
        if (data && data.length > 0) {
          console.log('Sample print row:', JSON.stringify(data[0]));
        }
        allData = [...allData, ...(data ?? [])];
        if (!data || data.length < pageSize) break;
        page++;
      }
      console.log('Total prints loaded from query:', allData.length);
      return allData as unknown as PrintOrderRow[];
    },
  });
}

function useSockSales(enabled: boolean) {
  return useQuery({
    queryKey: ['sales-report-socks'],
    enabled,
    queryFn: async () => {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('sock_sales_reports')
          .select('*')
          .order('report_date', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allData = [...allData, ...(data ?? [])];
        if (!data || data.length < pageSize) break;
        page++;
      }
      return allData as unknown as SockRow[];
    },
  });
}

function useDressingRoomSales(enabled: boolean) {
  return useQuery({
    queryKey: ['sales-report-dressing-room'],
    enabled,
    queryFn: async () => {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('rental_orders')
          .select('id, order_number, customer_name, customer_email, customer_phone, duration_days, subtotal, deposit_amount, total, status, payment_status, created_at, updated_at, rental_order_items(*)')
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allData = [...allData, ...(data ?? [])];
        if (!data || data.length < pageSize) break;
        page++;
      }
      return allData as unknown as RentalOrderRow[];
    },
  });
}

export default function SalesReport() {
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
  const [to,   setTo]   = useState(today);
  const [tab, setTab] = useState<'tickets' | 'products' | 'prints' | 'socks' | 'dressing-room'>('tickets');
  const [ticketPage, setTicketPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [printPage, setPrintPage] = useState(1);
  const [sockPage, setSockPage] = useState(1);
  const [dressingRoomPage, setDressingRoomPage] = useState(1);

  const { data: tickets  = [], isLoading: ticketsLoading,  error: ticketsError, refetch: refetchTickets } = useTicketSales(queryEnabled);
  const { data: products = [], isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useProductSales(queryEnabled);
  const { data: prints   = [], isLoading: printsLoading,   error: printsError, refetch: refetchPrints } = usePrintSales(queryEnabled);
  const { data: socks    = [], isLoading: socksLoading,    error: socksError, refetch: refetchSocks } = useSockSales(queryEnabled);
  const { data: dressingRooms = [], isLoading: dressingRoomsLoading, error: dressingRoomsError, refetch: refetchDressingRooms } = useDressingRoomSales(queryEnabled);

  // Auto-refresh effect (every 10 seconds, silent)
  useEffect(() => {
    if (!queryEnabled) return;

    const interval = setInterval(() => {
      refetchTickets();
      refetchProducts();
      refetchPrints();
      refetchSocks();
      refetchDressingRooms();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [queryEnabled, refetchTickets, refetchProducts, refetchPrints, refetchSocks, refetchDressingRooms]);

  const queryError = ticketsError || productsError || printsError || socksError || dressingRoomsError;
  const isAuthError = queryError instanceof Error &&
    (queryError.message.includes('JWT') ||
     queryError.message.includes('token') ||
     queryError.message.includes('401') ||
     queryError.message.includes('403') ||
     queryError.message.includes('400'));

  // ── Client-side date filter ───────────────────────────────────────────
  // Convert date strings to UTC timestamps for consistent filtering
  const getUTCTimestamp = (dateStr: string, isEnd: boolean = false): number => {
    if (!dateStr) return isEnd ? Infinity : 0;
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create UTC date
    const date = new Date(Date.UTC(year, month - 1, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0));
    return date.getTime();
  };
  
  const fromMs = getUTCTimestamp(from, false);
  const toMs   = getUTCTimestamp(to, true);

  const filteredTickets = useMemo(() =>
    tickets.filter(t => {
      const ms = new Date(t.created_at).getTime();
      return ms >= fromMs && ms <= toMs;
    }),
    [tickets, fromMs, toMs]
  );

  const filteredProducts = useMemo(() =>
    products.filter(o => {
      // Use paid_at for date filtering (when money was actually received)
      const dateStr = o.paid_at || o.created_at;
      if (!dateStr) return false;
      const ms = new Date(dateStr).getTime();
      // Filter out test orders with test prices (1000 or 10)
      const hasTestPrice = o.order_product_items.some(item => item.price === 1000 || item.price === 10);
      return ms >= fromMs && ms <= toMs && !hasTestPrice;
    }),
    [products, fromMs, toMs]
  );

  const filteredPrints = useMemo(() =>
    prints.filter(p => {
      // Use paid_at for date filtering (when payment was confirmed) - must match DOKU date
      const dateStr = p.paid_at || p.created_at;
      if (!dateStr) return false;
      const ms = new Date(dateStr).getTime();
      return ms >= fromMs && ms <= toMs;
    }),
    [prints, fromMs, toMs]
  );

  const filteredSocks = useMemo(() =>
    socks.filter(s => {
      // Use report_date for filtering
      const ms = new Date(s.report_date).getTime();
      return ms >= fromMs && ms <= toMs;
    }),
    [socks, fromMs, toMs]
  );

  const filteredDressingRooms = useMemo(() =>
    dressingRooms.filter(d => {
      // Use created_at for filtering
      const ms = new Date(d.created_at).getTime();
      return ms >= fromMs && ms <= toMs;
    }),
    [dressingRooms, fromMs, toMs]
  );

  // ── Pagination ───────────────────────────────────────────────────
  const ITEMS_PER_PAGE = 100;
  
  const ticketPagination = useMemo(() => {
    const total = filteredTickets.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const page = Math.max(1, Math.min(ticketPage, totalPages));
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      data: filteredTickets.slice(start, end),
      page,
      totalPages,
      total,
      start,
    };
  }, [filteredTickets, ticketPage]);

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
  }, [filteredProducts, productPage]);

  const printPagination = useMemo(() => {
    const total = filteredPrints.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const page = Math.max(1, Math.min(printPage, totalPages));
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      data: filteredPrints.slice(start, end),
      page,
      totalPages,
      total,
      start,
    };
  }, [filteredPrints, printPage]);

  const sockPagination = useMemo(() => {
    const total = filteredSocks.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const page = Math.max(1, Math.min(sockPage, totalPages));
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      data: filteredSocks.slice(start, end),
      page,
      totalPages,
      total,
      start,
    };
  }, [filteredSocks, sockPage]);

  const dressingRoomPagination = useMemo(() => {
    const total = filteredDressingRooms.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const page = Math.max(1, Math.min(dressingRoomPage, totalPages));
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return {
      data: filteredDressingRooms.slice(start, end),
      page,
      totalPages,
      total,
      start,
    };
  }, [filteredDressingRooms, dressingRoomPage]);

  // ── Summaries ────────────────────────────────────────────────────────────
  const ticketStats = useMemo(() => {
    const paid = filteredTickets.length;
    const revenue = paid * TICKET_PRICE;
    console.log(`[SalesReport] Tickets - Count: ${paid}, Revenue: ${revenue}`);
    return { paid, revenue, used: paid };
  }, [filteredTickets]);
  
  // Reset pages when filters change
  useMemo(() => {
    setTicketPage(1);
    setProductPage(1);
    setPrintPage(1);
    setSockPage(1);
    setDressingRoomPage(1);
  }, [from, to]);
  
  const productStats = useMemo(() => {
    const productOrders = filteredProducts.length;
    const productRevenue = filteredProducts.reduce((s, o) => s + (o.total || 0), 0);
    const items = filteredProducts.reduce((s, o) => s + o.order_product_items.reduce((ss, i) => ss + i.quantity, 0), 0);
    console.log(`[SalesReport] Products - Count: ${productOrders}, Revenue: ${productRevenue}, Items: ${items}`);
    return { orders: productOrders, revenue: productRevenue, items };
  }, [filteredProducts]);

  const printStats = useMemo(() => {
    const orders = filteredPrints.length;
    const revenue = filteredPrints.reduce((s, p) => s + (p.amount || 0), 0);
    console.log(`[SalesReport] Prints - Count: ${orders}, Revenue: ${revenue}`);
    return { orders, revenue };
  }, [filteredPrints]);

  const sockStats = useMemo(() => {
    const orders = filteredSocks.length;
    const revenue = filteredSocks.reduce((s, s_) => s + (s_.total || 0), 0);
    const quantity = filteredSocks.reduce((s, s_) => s + (s_.terjual || 0), 0);
    console.log(`[SalesReport] Socks - Count: ${orders}, Revenue: ${revenue}, Qty: ${quantity}`);
    return { orders, revenue, quantity };
  }, [filteredSocks]);

  const dressingRoomStats = useMemo(() => {
    const orders = filteredDressingRooms.length;
    const revenue = filteredDressingRooms.reduce((s, d) => s + (d.total || 0), 0);
    const items = filteredDressingRooms.reduce((s, d) => s + (d.rental_order_items?.reduce((ss, i) => ss + i.quantity, 0) || 0), 0);
    console.log(`[SalesReport] Dressing Room - Count: ${orders}, Revenue: ${revenue}, Items: ${items}`);
    return { orders, revenue, items };
  }, [filteredDressingRooms]);

  const totalRevenue = ticketStats.revenue + productStats.revenue + printStats.revenue + sockStats.revenue + dressingRoomStats.revenue;
  console.log(`[SalesReport] TOTAL REVENUE: ${totalRevenue} (Tickets: ${ticketStats.revenue} + Products: ${productStats.revenue} + Prints: ${printStats.revenue} + Socks: ${sockStats.revenue} + Dressing Room: ${dressingRoomStats.revenue})`);

  // ── XLSX Exports ──────────────────────────────────────────────────────────
  function exportTicketsXLSX() {
    const ts = new Date().toISOString().slice(0, 10);
    const rows = filteredTickets.map((t, i) => ({
      'No': i + 1,
      'Kode Tiket': t.ticket_code ?? '-',
      'Nama Tiket': t.tickets?.name ?? '-',
      'Tanggal Valid': formatDate(t.valid_date),
      'Sesi': t.time_slot ?? '-',
      'Status': t.status,
      'Harga (Rp)': TICKET_PRICE,
      'Tanggal Beli': formatDatetime(t.created_at),
      'Tanggal Pakai': formatDatetime(t.used_at),
    }));
    // Totals row
    rows.push({ 'No': '', 'Kode Tiket': '', 'Nama Tiket': 'TOTAL', 'Tanggal Valid': '', 'Sesi': '', 'Status': '', 'Harga (Rp)': ticketStats.revenue, 'Tanggal Beli': '', 'Tanggal Pakai': '' } as any);
    downloadXLSX(`laporan-tiket-${ts}.xlsx`, [{ name: 'Tiket Terjual', rows }]);
  }

  function exportProductsXLSX() {
    const ts = new Date().toISOString().slice(0, 10);

    // Sheet 1 — Orders
    const orderRows = filteredProducts.map((o, i) => ({
      'No': i + 1,
      'No. Order': o.order_number,
      'Nama Customer': o.profiles?.name ?? '-',
      'Email': o.profiles?.email ?? '-',
      'Total (Rp)': o.total,
      'Status Pickup': o.pickup_status ?? '-',
      'Tanggal Bayar': formatDatetime(o.paid_at),
      'Tanggal Buat': formatDatetime(o.created_at),
    }));
    orderRows.push({ 'No': '', 'No. Order': 'TOTAL', 'Nama Customer': '', 'Email': '', 'Total (Rp)': productStats.revenue, 'Status Pickup': '', 'Tanggal Bayar': '', 'Tanggal Buat': '' } as any);

    // Sheet 2 — Item Detail (per produk per order)
    const itemRows: Record<string, unknown>[] = [];
    filteredProducts.forEach(o => {
      o.order_product_items.forEach(item => {
        itemRows.push({
          'No. Order': o.order_number,
          'Nama Customer': o.profiles?.name ?? '-',
          'Produk': item.product_variants?.products?.name ?? '-',
          'Varian': item.product_variants?.name ?? '-',
          'Qty': item.quantity,
          'Harga (Rp)': item.price,
          'Subtotal (Rp)': item.subtotal,
          'Tanggal Bayar': formatDatetime(o.paid_at),
        });
      });
    });

    // Sheet 3 — Stok Opname (aggregated: qty terjual per produk)
    const stockMap = new Map<string, { terjual: number; pendapatan: number }>();
    filteredProducts.forEach(o => {
      o.order_product_items.forEach(item => {
        const key = `${item.product_variants?.products?.name ?? 'Unknown'} — ${item.product_variants?.name ?? '-'}`;
        const prev = stockMap.get(key) ?? { terjual: 0, pendapatan: 0 };
        stockMap.set(key, {
          terjual: prev.terjual + item.quantity,
          pendapatan: prev.pendapatan + item.subtotal,
        });
      });
    });
    const stockRows = Array.from(stockMap.entries()).map(([nama, v]) => ({
      'Produk — Varian': nama,
      'Total Terjual (qty)': v.terjual,
      'Total Pendapatan (Rp)': v.pendapatan,
    }));

    downloadXLSX(`laporan-produk-${ts}.xlsx`, [
      { name: 'Pesanan', rows: orderRows },
      { name: 'Detail Item', rows: itemRows },
      { name: 'Stok Opname', rows: stockRows },
    ]);
  }

  function exportPrintsXLSX() {
    const ts = new Date().toISOString().slice(0, 10);
    const rows = filteredPrints.map((p, i) => ({
      'No': i + 1,
      'Doku Order ID': p.doku_order_id ?? '-',
      'Nama Customer': p.customer_name ?? '-',
      'Email': p.customer_email ?? '-',
      'Amount (Rp)': p.amount,
      'Status': p.status ?? '-',
      'No. Antrian': p.queue_number ?? '-',
      'Tanggal Bayar': formatDatetime(p.paid_at),
      'Tanggal Buat': formatDatetime(p.created_at),
    }));
    rows.push({ 'No': '', 'Doku Order ID': 'TOTAL', 'Nama Customer': '', 'Email': '', 'Amount (Rp)': printStats.revenue, 'Status': '', 'No. Antrian': '', 'Tanggal Bayar': '', 'Tanggal Buat': '' } as any);
    downloadXLSX(`laporan-cetak-${ts}.xlsx`, [{ name: 'Cetak', rows }]);
  }

  function exportSocksXLSX() {
    const ts = new Date().toISOString().slice(0, 10);
    const rows = filteredSocks.map((s, i) => ({
      'No': i + 1,
      'Tanggal Laporan': formatDate(s.report_date),
      'Stok Awal': s.stock_awal,
      'Terjual': s.terjual,
      'Sisa': s.sisa,
      'Harga per Pasang (Rp)': s.harga_per_pasang,
      'Total (Rp)': s.total,
      'Catatan': s.catatan ?? '-',
      'Tanggal Input': formatDatetime(s.created_at),
    }));
    rows.push({ 'No': '', 'Tanggal Laporan': 'TOTAL', 'Stok Awal': '', 'Terjual': filteredSocks.reduce((s, s_) => s + s_.terjual, 0), 'Sisa': '', 'Harga per Pasang (Rp)': '', 'Total (Rp)': sockStats.revenue, 'Catatan': '', 'Tanggal Input': '' } as any);
    downloadXLSX(`laporan-kaos-kaki-${ts}.xlsx`, [{ name: 'Kaos Kaki', rows }]);
  }

  function exportDressingRoomXLSX() {
    const ts = new Date().toISOString().slice(0, 10);
    
    // Sheet 1 — Orders
    const orderRows = filteredDressingRooms.map((d, i) => ({
      'No': i + 1,
      'No. Order': d.order_number,
      'Nama Customer': d.customer_name,
      'Email': d.customer_email,
      'Telepon': d.customer_phone ?? '-',
      'Durasi (Hari)': d.duration_days,
      'Subtotal (Rp)': d.subtotal,
      'Deposit (Rp)': d.deposit_amount,
      'Total (Rp)': d.total,
      'Status': d.status,
      'Tanggal Order': formatDatetime(d.created_at),
    }));
    orderRows.push({ 'No': '', 'No. Order': 'TOTAL', 'Nama Customer': '', 'Email': '', 'Telepon': '', 'Durasi (Hari)': '', 'Subtotal (Rp)': '', 'Deposit (Rp)': '', 'Total (Rp)': dressingRoomStats.revenue, 'Status': '', 'Tanggal Order': '' } as any);

    // Sheet 2 — Items Detail
    const itemRows: Record<string, unknown>[] = [];
    filteredDressingRooms.forEach(d => {
      d.rental_order_items?.forEach(item => {
        itemRows.push({
          'No. Order': d.order_number,
          'Nama Customer': d.customer_name,
          'Nama Item': item.product_name,
          'Qty': item.quantity,
          'Harga Harian (Rp)': item.daily_rate,
          'Deposit Item (Rp)': item.item_deposit_amount,
          'Total Rental (Rp)': item.total_rental_cost,
          'Tanggal Order': formatDatetime(d.created_at),
        });
      });
    });

    downloadXLSX(`laporan-dressing-room-${ts}.xlsx`, [
      { name: 'Pesanan', rows: orderRows },
      ...(itemRows.length > 0 ? [{ name: 'Detail Item', rows: itemRows }] : []),
    ]);
  }

  const isLoading = tab === 'tickets' ? ticketsLoading : tab === 'products' ? productsLoading : tab === 'prints' ? printsLoading : tab === 'socks' ? socksLoading : dressingRoomsLoading;

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="sales-report"
      title="Laporan Penjualan"
      onLogout={signOut}
    >
      {/* ── Auth / Query Error Banner ──────────────────────────── */}
      {queryError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 text-2xl flex-shrink-0">error</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-800 text-sm">
              {isAuthError ? 'Sesi habis — silakan login ulang' : 'Gagal memuat data'}
            </p>
            <p className="text-red-600 text-xs mt-1">
              {isAuthError
                ? 'Token autentikasi tidak valid. Klik "Keluar" lalu login kembali untuk melanjutkan.'
                : (queryError instanceof Error ? queryError.message : 'Terjadi kesalahan saat mengambil data.')}
            </p>
          </div>
          {isAuthError && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Keluar
            </button>
          )}
        </div>
      )}
      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        {[
          { label: 'Total Pendapatan', value: formatRupiah(totalRevenue), icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Tiket Terpakai', value: `${ticketStats.paid} tiket`, icon: 'confirmation_number', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
          { label: 'Pendapatan Tiket', value: formatRupiah(ticketStats.revenue), icon: 'local_activity', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Pendapatan Produk', value: formatRupiah(productStats.revenue), icon: 'shopping_bag', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
          { label: 'Pendapatan Cetak', value: formatRupiah(printStats.revenue), icon: 'print', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
          { label: 'Pendapatan Kaos Kaki', value: formatRupiah(sockStats.revenue), icon: 'checkroom', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'Pendapatan Dressing Room', value: formatRupiah(dressingRoomStats.revenue), icon: 'checkroom', color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border ${card.bg} p-4 flex flex-col gap-2`}>
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-xl ${card.color}`}>{card.icon}</span>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
            <p className="text-xl font-black text-gray-900 leading-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <span className="material-symbols-outlined text-gray-400 hidden sm:block">filter_list</span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-gray-500 whitespace-nowrap">Dari</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-main-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-gray-500 whitespace-nowrap">Sampai</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-main-500"
          />
        </div>
        <button
          onClick={() => { setFrom(firstOfMonth); setTo(today); }}
          className="text-xs text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1 ml-auto"
        >
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          Reset
        </button>
      </div>

      {/* ── Tabs + Export ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 gap-2 flex-wrap">
          {/* Tab Switcher */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab('tickets')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${tab === 'tickets' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                Tiket ({ticketStats.paid})
              </span>
            </button>
            <button
              onClick={() => setTab('products')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${tab === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                Produk ({productStats.orders})
              </span>
            </button>
            <button
              onClick={() => setTab('prints')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${tab === 'prints' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">print</span>
                Cetak ({printStats.orders})
              </span>
            </button>
            <button
              onClick={() => setTab('socks')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${tab === 'socks' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">checkroom</span>
                Kaos Kaki ({sockStats.orders})
              </span>
            </button>
            <button
              onClick={() => setTab('dressing-room')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${tab === 'dressing-room' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">checkroom</span>
                Dressing Room ({dressingRoomStats.orders})
              </span>
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={tab === 'tickets' ? exportTicketsXLSX : tab === 'products' ? exportProductsXLSX : tab === 'prints' ? exportPrintsXLSX : tab === 'socks' ? exportSocksXLSX : exportDressingRoomXLSX}
            disabled={isLoading || (tab === 'tickets' ? tickets.length === 0 : tab === 'products' ? products.length === 0 : tab === 'prints' ? prints.length === 0 : tab === 'socks' ? socks.length === 0 : dressingRooms.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Excel
          </button>
        </div>

        {/* ── Tickets Table ──────────────────────────────────────── */}
        {tab === 'tickets' && (
          <>
            <div className="px-4 py-2 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
              <span className="text-xs text-violet-700">
                Harga per tiket: <strong>{formatRupiah(TICKET_PRICE)}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-violet-700">
                Total: <strong>{formatRupiah(ticketStats.revenue)}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-violet-700">
                Sudah masuk: <strong>{ticketStats.used}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['No', 'Kode Tiket', 'Nama Tiket', 'Tanggal Valid', 'Sesi', 'Status', 'Harga', 'Dibuat'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : ticketPagination.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                        Tidak ada data tiket di periode ini
                      </td>
                    </tr>
                  ) : ticketPagination.data.map((t, i) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs">{ticketPagination.start + i + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{t.ticket_code ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{t.tickets?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(t.valid_date)}</td>
                      <td className="px-4 py-3 text-gray-600">{t.time_slot?.slice(0, 5) ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          t.status === 'active'  ? 'bg-green-100 text-green-700' :
                          t.status === 'used'    ? 'bg-blue-100 text-blue-700' :
                          t.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                          'bg-red-100 text-red-700'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatRupiah(TICKET_PRICE)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!isLoading && ticketPagination.data.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>
                    Menampilkan <strong>{ticketPagination.start + 1}–{Math.min(ticketPagination.start + ITEMS_PER_PAGE, ticketPagination.total)}</strong> dari <strong>{ticketPagination.total}</strong> tiket
                  </span>
                  <span>·</span>
                  <span className="font-bold text-gray-900">{formatRupiah(ticketStats.revenue)}</span>
                </div>
                
                {ticketPagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTicketPage(p => Math.max(1, p - 1))}
                      disabled={ticketPagination.page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      Sebelumnya
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: ticketPagination.totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setTicketPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              ticketPagination.page === pageNum
                                ? 'bg-violet-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setTicketPage(p => Math.min(ticketPagination.totalPages, p + 1))}
                      disabled={ticketPagination.page === ticketPagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Berikutnya
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Products Table ─────────────────────────────────────── */}
        {tab === 'products' && (
          <>
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-blue-700">
                Total: <strong>{productStats.orders}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-blue-700">
                Item: <strong>{productStats.items}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-blue-700">
                Revenue: <strong>{formatRupiah(productStats.revenue)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['No', 'No. Order', 'Customer', 'Total', 'Status', 'Tanggal Bayar', 'Dibuat'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : productPagination.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                        Tidak ada pesanan produk di periode ini
                      </td>
                    </tr>
                  ) : (
                    productPagination.data.map((o, i) => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{productPagination.start + i + 1}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{o.order_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-xs">{o.profiles?.name ?? '-'}</p>
                          <p className="text-gray-400 text-xs">{o.profiles?.email ?? ''}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{formatRupiah(o.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            o.pickup_status === 'completed' ? 'bg-green-100 text-green-700' :
                            o.pickup_status === 'pending_pickup' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{o.pickup_status ?? '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(o.paid_at)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(o.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!isLoading && productPagination.data.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>
                    Menampilkan <strong>{productPagination.start + 1}–{Math.min(productPagination.start + ITEMS_PER_PAGE, productPagination.total)}</strong> dari <strong>{productPagination.total}</strong> pesanan
                  </span>
                  <span>·</span>
                  <span className="font-bold text-gray-900">{formatRupiah(productStats.revenue)}</span>
                </div>
                
                {productPagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProductPage(p => Math.max(1, p - 1))}
                      disabled={productPagination.page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-700 disabled:hover:bg-gray-100"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      Sebelumnya
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: productPagination.totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setProductPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              productPagination.page === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setProductPage(p => Math.min(productPagination.totalPages, p + 1))}
                      disabled={productPagination.page === productPagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-700 disabled:hover:bg-gray-100"
                    >
                      Berikutnya
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Prints Table ──────────────────────────────────────── */}
        {tab === 'prints' && (
          <>
            <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-orange-700">
                Total: <strong>{printStats.orders}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-orange-700">
                Revenue: <strong>{formatRupiah(printStats.revenue)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['No', 'Doku Order ID', 'Nama Customer', 'Email', 'Amount', 'Status', 'Tanggal Bayar', 'Dibuat'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {printsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : printPagination.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                        Tidak ada pesanan cetak di periode ini
                      </td>
                    </tr>
                  ) : (
                    printPagination.data.map((p, i) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{printPagination.start + i + 1}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs">{p.doku_order_id ?? '-'}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-xs">{p.customer_name ?? '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{p.customer_email ?? '-'}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{formatRupiah(p.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            p.status === 'paid' ? 'bg-green-100 text-green-700' :
                            p.status === 'PRINTED' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{p.status ?? '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(p.paid_at)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!isLoading && printPagination.data.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>
                    Menampilkan <strong>{printPagination.start + 1}–{Math.min(printPagination.start + ITEMS_PER_PAGE, printPagination.total)}</strong> dari <strong>{printPagination.total}</strong> pesanan
                  </span>
                  <span>·</span>
                  <span className="font-bold text-gray-900">{formatRupiah(printStats.revenue)}</span>
                </div>
                
                {printPagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPrintPage(p => Math.max(1, p - 1))}
                      disabled={printPagination.page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-orange-300 rounded-lg text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-700 disabled:hover:bg-gray-100"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      Sebelumnya
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: printPagination.totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPrintPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              printPagination.page === pageNum
                                ? 'bg-orange-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setPrintPage(p => Math.min(printPagination.totalPages, p + 1))}
                      disabled={printPagination.page === printPagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-orange-300 rounded-lg text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-700 disabled:hover:bg-gray-100"
                    >
                      Berikutnya
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* -- Socks Table ------------------------------------------ */}
        {tab === 'socks' && (
          <>
            <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-indigo-700">
                Total Hari: <strong>{sockStats.orders}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-indigo-700">
                Total Terjual: <strong>{sockStats.quantity} pasang</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-indigo-700">
                Revenue: <strong>{formatRupiah(sockStats.revenue)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['No', 'Tanggal', 'Stok Awal', 'Terjual', 'Sisa', 'Harga/Pasang', 'Total', 'Catatan'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {socksLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : sockPagination.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                        Tidak ada data kaos kaki di periode ini
                      </td>
                    </tr>
                  ) : (
                    sockPagination.data.map((s, i) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{sockPagination.start + i + 1}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{formatDate(s.report_date)}</td>
                        <td className="px-4 py-3 text-gray-700 text-right">{s.stock_awal}</td>
                        <td className="px-4 py-3 text-gray-700 font-bold text-right text-green-600">{s.terjual}</td>
                        <td className="px-4 py-3 text-gray-700 text-right">{s.sisa}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatRupiah(s.harga_per_pasang)}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{formatRupiah(s.total)}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.catatan ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!isLoading && sockPagination.data.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>
                    Menampilkan <strong>{sockPagination.start + 1}–{Math.min(sockPagination.start + ITEMS_PER_PAGE, sockPagination.total)}</strong> dari <strong>{sockPagination.total}</strong> hari
                  </span>
                  <span>·</span>
                  <span className="font-bold text-gray-900">{formatRupiah(sockStats.revenue)}</span>
                </div>
                
                {sockPagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSockPage(p => Math.max(1, p - 1))}
                      disabled={sockPagination.page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      Sebelumnya
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: sockPagination.totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setSockPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              sockPagination.page === pageNum
                                ? 'bg-indigo-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setSockPage(p => Math.min(sockPagination.totalPages, p + 1))}
                      disabled={sockPagination.page === sockPagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Berikutnya
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Dressing Room Table ──────────────────────────────── */}
        {tab === 'dressing-room' && (
          <>
            <div className="px-4 py-2 bg-cyan-50 border-b border-cyan-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-cyan-700">
                Total Orders: <strong>{dressingRoomStats.orders}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-cyan-700">
                Items Rented: <strong>{dressingRoomStats.items}</strong>
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-cyan-700">
                Revenue: <strong>{formatRupiah(dressingRoomStats.revenue)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['No', 'No. Order', 'Nama Customer', 'Email', 'Durasi (Hari)', 'Total (Rp)', 'Status', 'Tanggal Order'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dressingRoomsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : dressingRoomPagination.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                        Tidak ada data dressing room di periode ini
                      </td>
                    </tr>
                  ) : (
                    dressingRoomPagination.data.map((d, i) => (
                      <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{dressingRoomPagination.start + i + 1}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs whitespace-nowrap">{d.order_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-xs">{d.customer_name}</p>
                          <p className="text-gray-400 text-xs">{d.customer_phone ?? '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{d.customer_email}</td>
                        <td className="px-4 py-3 text-gray-700 text-center font-bold">{d.duration_days}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{formatRupiah(d.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            d.status === 'returned' ? 'bg-green-100 text-green-700' :
                            d.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            d.status === 'paid' ? 'bg-yellow-100 text-yellow-700' :
                            d.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{d.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(d.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!isLoading && dressingRoomPagination.data.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>
                    Menampilkan <strong>{dressingRoomPagination.start + 1}–{Math.min(dressingRoomPagination.start + ITEMS_PER_PAGE, dressingRoomPagination.total)}</strong> dari <strong>{dressingRoomPagination.total}</strong> pesanan
                  </span>
                  <span>·</span>
                  <span className="font-bold text-gray-900">{formatRupiah(dressingRoomStats.revenue)}</span>
                </div>
                
                {dressingRoomPagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDressingRoomPage(p => Math.max(1, p - 1))}
                      disabled={dressingRoomPagination.page === 1}
                      className="flex items-center gap-1 px-3 py-1.5 border border-cyan-300 rounded-lg text-sm font-medium text-cyan-700 hover:bg-cyan-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-700 disabled:hover:bg-gray-100"
                    >
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      Sebelumnya
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: dressingRoomPagination.totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setDressingRoomPage(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              dressingRoomPagination.page === pageNum
                                ? 'bg-cyan-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setDressingRoomPage(p => Math.min(dressingRoomPagination.totalPages, p + 1))}
                      disabled={dressingRoomPagination.page === dressingRoomPagination.totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 border border-cyan-300 rounded-lg text-sm font-medium text-cyan-700 hover:bg-cyan-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-700 disabled:hover:bg-gray-100"
                    >
                      Berikutnya
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
