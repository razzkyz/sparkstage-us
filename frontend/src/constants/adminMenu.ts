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

export const STARGUIDE_MENU_SECTIONS: AdminMenuSection[] = [
  {
    id: "tickets",
    label: "Tiket",
    items: [
      {
        id: "event-bookings",
        label: "Event Bookings",
        icon: "event_note",
        path: "/admin/event-bookings",
      },
      {
        id: "order-ticket",
        label: "Scan Tiket Masuk",
        icon: "qr_code_scanner",
        path: "/admin/order-ticket",
        highlight: true,
      },
      {
        id: "tablet-qr-scanner",
        label: "Scan QR Tablet",
        icon: "tablet_android",
        path: "/admin/tablet-qr-scanner",
        highlight: true,
      },
      {
        id: "entrance-log",
        label: "Log Tiket Masuk",
        icon: "fact_check",
        path: "/admin/tickets",
      },
    ],
  },
  {
    id: "laporan",
    label: "Laporan",
    items: [
      {
        id: "sock-report",
        label: "Laporan Kaos Kaki",
        icon: "inventory_2",
        path: "/admin/sock-report",
        highlight: true,
      },
    ],
  },
];

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
  {
    id: "dressing-room",
    label: "Dressing Room",
    items: [
      {
        id: "dressing-room-dashboard",
        label: "Dashboard Dressing",
        icon: "dashboard",
        path: "/admin/dressing-room-dashboard",
      },
      {
        id: "dressing-room-inventory",
        label: "Inventory & Stok",
        icon: "inventory_2",
        path: "/admin/dressing-room-inventory",
      },
      {
        id: "dressing-room-products",
        label: "Produk Dressing Room",
        icon: "shopping_bag",
        path: "/admin/dressing-room-products",
      },
      {
        id: "dressing-room",
        label: "Dressing Room Manager",
        icon: "styler",
        path: "/admin/dressing-room",
      },
      {
        id: "rental-orders",
        label: "Sewa Dressing Room",
        icon: "checkroom",
        path: "/admin/rental-orders",
        highlight: true,
      },
      {
        id: "rental-scanner",
        label: "Scan QR Rental Pickup",
        icon: "qr_code_scanner",
        path: "/admin/rental-scanner",
        highlight: true,
      },
    ],
  },
];

export const ADMIN_MENU_SECTIONS: AdminMenuSection[] = [
  {
    id: "management",
    label: "Manajemen",
    items: [
      {
        id: "stages",
        label: "Kelola Stage",
        icon: "grid_view",
        path: "/admin/stages",
      },
      {
        id: "qr-bulk",
        label: "Kelola QR Massal",
        icon: "qr_code_2",
        path: "/admin/qr-bulk",
      },
      {
        id: "stage-analytics",
        label: "Analitik Stage",
        icon: "analytics",
        path: "/admin/stage-analytics",
      },
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
      {
        id: "event-page",
        label: "Event Page Config",
        icon: "edit_document",
        path: "/admin/event-page",
      },
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
  {
    id: "tickets",
    label: "Tiket",
    items: [
      {
        id: "booking-page",
        label: "Booking Page Config",
        icon: "calendar_month",
        path: "/admin/booking-page",
      },
      {
        id: "entrance-booking",
        label: "Entrance Booking Manager",
        icon: "event_available",
        path: "/admin/entrance-booking",
      },
      {
        id: "event-bookings",
        label: "Event Bookings",
        icon: "event_note",
        path: "/admin/event-bookings",
      },
      {
        id: "order-ticket",
        label: "Scan Tiket Masuk",
        icon: "qr_code_scanner",
        path: "/admin/order-ticket",
        highlight: true,
      },
      {
        id: "tablet-qr-scanner",
        label: "Scan QR Tablet",
        icon: "tablet_android",
        path: "/admin/tablet-qr-scanner",
        highlight: true,
      },
      {
        id: "entrance-log",
        label: "Log Tiket Masuk",
        icon: "fact_check",
        path: "/admin/tickets",
      },
    ],
  },
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
  {
    id: "dressing-room",
    label: "Dressing Room",
    items: [
      {
        id: "dressing-room-dashboard",
        label: "Dashboard Dressing",
        icon: "dashboard",
        path: "/admin/dressing-room-dashboard",
      },
      {
        id: "dressing-room-inventory",
        label: "Inventory & Stok",
        icon: "inventory_2",
        path: "/admin/dressing-room-inventory",
      },
      {
        id: "dressing-room-products",
        label: "Produk Dressing Room",
        icon: "shopping_bag",
        path: "/admin/dressing-room-products",
      },
      {
        id: "dressing-room",
        label: "Dressing Room Manager",
        icon: "styler",
        path: "/admin/dressing-room",
      },
      {
        id: "rental-orders",
        label: "Sewa Dressing Room",
        icon: "checkroom",
        path: "/admin/rental-orders",
        highlight: true,
      },
      {
        id: "rental-scanner",
        label: "Scan QR Rental Pickup",
        icon: "qr_code_scanner",
        path: "/admin/rental-scanner",
        highlight: true,
      },
    ],
  },
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
