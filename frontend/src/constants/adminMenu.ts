import {
  type AdminMenuItem,
  type AdminMenuSection,
} from "../components/AdminLayout";

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    path: "/admin/dashboard",
    filled: true,
  },
];

// STARGUIDE_MENU_SECTIONS removed - US version is e-commerce only (no ticket booking)

export const CASHIER_MENU_SECTIONS: AdminMenuSection[] = [
  {
    id: "sales",
    label: "Penjualan",
    items: [
      {
        id: "retail-dashboard",
        label: "Sales Back Office",
        icon: "point_of_sale",
        path: "/admin/retail-dashboard",
        highlight: true,
      },
      {
        id: "cashier-dashboard",
        label: "Dashboard Penjualan",
        icon: "dashboard",
        path: "/admin/cashier-dashboard",
        highlight: false,
      },
      {
        id: "cashier-orders",
        label: "Cek Pesanan",
        icon: "receipt_long",
        path: "/admin/cashier-orders",
      },
      {
        id: "product-scan",
        label: "Scan QR Produk",
        icon: "qr_code_scanner",
        path: "/admin/product-pickup",
        highlight: true,
      },
    ],
  },
  {
    id: "laporan",
    label: "Laporan",
    items: [
      {
        id: "sales-report",
        label: "Laporan Penjualan",
        icon: "assessment",
        path: "/admin/sales-report",
        highlight: true,
      },
    ],
  },
];

export const OWNER_MENU_SECTIONS: AdminMenuSection[] = [
  {
    id: "sales",
    label: "Penjualan",
    items: [
      {
        id: "retail-dashboard",
        label: "Sales Back Office",
        icon: "point_of_sale",
        path: "/admin/retail-dashboard",
        highlight: true,
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventaris",
    items: [
      {
        id: "stock-opening",
        label: "Stock Opening",
        icon: "wb_twilight",
        path: "/admin/stock-opening",
        highlight: true,
      },
      {
        id: "stock-adjustments",
        label: "Stock Adjustments",
        icon: "tune",
        path: "/admin/stock-adjustments",
        highlight: true,
      },
      {
        id: "stock-opname",
        label: "Stock Opname",
        icon: "fact_check",
        path: "/admin/stock-opname",
        highlight: true,
      },
    ],
  },
  {
    id: "laporan",
    label: "Laporan",
    items: [
      {
        id: "sales-report",
        label: "Laporan Penjualan",
        icon: "assessment",
        path: "/admin/sales-report",
        highlight: true,
      },
    ],
  },
];

export const DRESSING_ROOM_ADMIN_MENU_SECTIONS: AdminMenuSection[] = [
  {
    id: "store",
    label: "Toko",
    items: [
      {
        id: "product-orders",
        label: "Pesanan Produk",
        icon: "shopping_bag",
        path: "/admin/product-orders",
        badge: 0,
      },
      {
        id: "product-pickup",
        label: "Scan Pickup Produk",
        icon: "qr_code_scanner",
        path: "/admin/product-pickup",
        highlight: true,
      },
      {
        id: "vouchers",
        label: "Voucher & Diskon",
        icon: "confirmation_number",
        path: "/admin/vouchers",
      },
      {
        id: "store-inventory",
        label: "Stok & Produk",
        icon: "inventory_2",
        path: "/admin/store",
      },
      {
        id: "stock-opening",
        label: "Stock Opening",
        icon: "wb_twilight",
        path: "/admin/stock-opening",
        highlight: true,
      },
      {
        id: "stock-adjustments",
        label: "Stock Adjustments",
        icon: "tune",
        path: "/admin/stock-adjustments",
        highlight: true,
      },
      {
        id: "stock-opname",
        label: "Stock Opname",
        icon: "fact_check",
        path: "/admin/stock-opname",
        highlight: true,
      },
      {
        id: "retail-products",
        label: "Produk Retail (E-Com)",
        icon: "storefront",
        path: "/admin/retail-products",
      },
    ],
  },
  // Dressing Room section removed - US version is e-commerce only (no costume rental)
];

export const ADMIN_MENU_SECTIONS: AdminMenuSection[] = [
  {
    id: "management",
    label: "Manajemen",
    items: [
      // Stage management removed - US version is e-commerce only (no photo booth stages)
      {
        id: "sales-report",
        label: "Laporan Penjualan",
        icon: "bar_chart_4_bars",
        path: "/admin/sales-report",
      },
      {
        id: "banner-manager",
        label: "Kelola Banner",
        icon: "image",
        path: "/admin/banner-manager",
      },
      // Event Page Config removed - US version is e-commerce only
      {
        id: "news-page",
        label: "News Page Config",
        icon: "article",
        path: "/admin/news-page",
      },
      {
        id: "charm-bar-page",
        label: "Charm Bar Config",
        icon: "diamond",
        path: "/admin/charm-bar-page",
      },
      {
        id: "venue-reviews",
        label: "Venue Reviews",
        icon: "star",
        path: "/admin/venue-reviews",
      },
      {
        id: "loyalty-points",
        label: "Kelola Poin Loyalty",
        icon: "card_giftcard",
        path: "/admin/loyalty-points",
        highlight: true,
      },
      {
        id: "audit-logs",
        label: "Audit Logs",
        icon: "history",
        path: "/admin/audit-logs",
      },
      {
        id: "divisions",
        label: "Kelola Divisi",
        icon: "apartment",
        path: "/admin/divisions",
      },
    ],
  },
  // Tickets section removed - US version is e-commerce only (no ticket booking)
  {
    id: "store",
    label: "Toko",
    items: [
      {
        id: "product-orders",
        label: "Pesanan Produk",
        icon: "shopping_bag",
        path: "/admin/product-orders",
        badge: 0,
      },
      {
        id: "product-pickup",
        label: "Scan Pickup Produk",
        icon: "qr_code_scanner",
        path: "/admin/product-pickup",
        highlight: true,
      },
      {
        id: "vouchers",
        label: "Voucher & Diskon",
        icon: "confirmation_number",
        path: "/admin/vouchers",
      },
      {
        id: "store-inventory",
        label: "Stok & Produk",
        icon: "inventory_2",
        path: "/admin/store",
      },
      {
        id: "stock-opening",
        label: "Stock Opening",
        icon: "wb_twilight",
        path: "/admin/stock-opening",
        highlight: true,
      },
      {
        id: "stock-adjustments",
        label: "Stock Adjustments",
        icon: "tune",
        path: "/admin/stock-adjustments",
        highlight: true,
      },
      {
        id: "stock-opname",
        label: "Stock Opname",
        icon: "fact_check",
        path: "/admin/stock-opname",
        highlight: true,
      },
      {
        id: "retail-products",
        label: "Produk Retail (E-Com)",
        icon: "storefront",
        path: "/admin/retail-products",
      },
    ],
  },
  // Dressing Room section removed - US version is e-commerce only (no costume rental)
  {
    id: "glam",
    label: "GLAM",
    items: [
      {
        id: "glam-page",
        label: "GLAM Page Config",
        icon: "auto_awesome",
        path: "/admin/glam-page",
      },
    ],
  },
];
