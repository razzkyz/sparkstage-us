import { lazy } from "react";

import type { AppRouteConfig } from "./routeTypes";

const Dashboard = lazy(() => import("../../pages/admin/Dashboard"));
const RetailDashboard = lazy(
  () => import("../../pages/admin/RetailDashboard"),
);
const CashierDashboard = lazy(
  () => import("../../pages/admin/CashierDashboard"),
);
const CashierOrders = lazy(() => import("../../pages/admin/CashierOrders"));
const TicketsManagement = lazy(
  () => import("../../pages/admin/TicketsManagement"),
);
const StoreInventory = lazy(() => import("../../pages/admin/StoreInventory"));
const StageManager = lazy(() => import("../../pages/admin/StageManager"));
const StageAnalytics = lazy(() => import("../../pages/admin/StageAnalytics"));
const StageBulkQR = lazy(() => import("../../pages/admin/StageBulkQR"));
const OrderTicket = lazy(() => import("../../pages/admin/OrderTicket"));
const ProductPickup = lazy(() => import("../../pages/admin/ProductPickup"));
const ProductOrders = lazy(() => import("../../pages/admin/ProductOrders"));
const VoucherManager = lazy(() => import("../../pages/admin/VoucherManager"));
const BannerManager = lazy(() => import("../../pages/admin/BannerManager"));
const EventsScheduleManager = lazy(
  () => import("../../pages/admin/EventsScheduleManager"),
);
const EventPageManager = lazy(
  () => import("../../pages/admin/EventPageManager"),
);
const NewsPageManager = lazy(() => import("../../pages/admin/NewsPageManager"));
const RentalOrders = lazy(() => import("../../pages/admin/RentalOrders"));
// EVENT BOOKINGS REMOVED - US version e-commerce only
// const EventBookings = lazy(() => import("../../pages/admin/EventBookings"));
const TabletQRScanner = lazy(() => import("../../pages/admin/TabletQRScanner"));
const RentalScannerPage = lazy(() => import("../../pages/admin/RentalScannerPage"));
const SalesReport = lazy(() => import("../../pages/admin/SalesReportSimple"));
const AuditLogsPage = lazy(() => import("../../pages/admin/AuditLogsPage"));
const AdminPointsManager = lazy(
  () => import("../../pages/admin/AdminPointsManager"),
);

const StarGuideSockReport = lazy(
  () => import("../../pages/admin/StarGuideSockReport"),
);

const StockOpening = lazy(() => import("../../pages/admin/StockOpening"));
const StockOpeningDetail = lazy(
  () => import("../../pages/admin/StockOpeningDetail"),
);
const StockAdjustments = lazy(
  () => import("../../pages/admin/StockAdjustments"),
);
const StockAdjustmentDetail = lazy(
  () => import("../../pages/admin/StockAdjustmentDetail"),
);
const StockOpname = lazy(() => import("../../pages/admin/StockOpname"));
const StockOpnameDetail = lazy(
  () => import("../../pages/admin/StockOpnameDetail"),
);

export const adminRouteConfigs: AppRouteConfig[] = [
  { path: "/admin/dashboard", Page: Dashboard },
  { path: "/admin/retail-dashboard", Page: RetailDashboard },
  { path: "/admin/cashier-dashboard", Page: CashierDashboard },
  { path: "/admin/cashier-orders", Page: CashierOrders },
  { path: "/admin/tickets", Page: TicketsManagement },
  { path: "/admin/store", Page: StoreInventory },
  { path: "/admin/stages", Page: StageManager },
  { path: "/admin/stage-analytics", Page: StageAnalytics },
  { path: "/admin/qr-bulk", Page: StageBulkQR },
  // BOOKING ADMIN ROUTES REMOVED - US version e-commerce only
  { path: "/admin/product-pickup", Page: ProductPickup },
  { path: "/admin/order-ticket", Page: OrderTicket },
  { path: "/admin/product-orders", Page: ProductOrders },
  { path: "/admin/vouchers", Page: VoucherManager },
  { path: "/admin/banner-manager", Page: BannerManager },
  { path: "/admin/events-schedule", Page: EventsScheduleManager },
  { path: "/admin/event-page", Page: EventPageManager },
  { path: "/admin/news-page", Page: NewsPageManager },
  { path: "/admin/rental-orders", Page: RentalOrders },
  // EVENT BOOKINGS REMOVED - US version e-commerce only
  { path: "/admin/tablet-qr-scanner", Page: TabletQRScanner },
  { path: "/admin/rental-scanner", Page: RentalScannerPage },
  { path: "/admin/sales-report", Page: SalesReport },
  { path: "/admin/audit-logs", Page: AuditLogsPage },
  { path: "/admin/loyalty-points", Page: AdminPointsManager },
  { path: "/admin/sock-report", Page: StarGuideSockReport },
  { path: "/admin/stock-opening", Page: StockOpening },
  { path: "/admin/stock-opening/:openingId", Page: StockOpeningDetail },
  { path: "/admin/stock-adjustments", Page: StockAdjustments },
  { path: "/admin/stock-adjustments/:adjustmentId", Page: StockAdjustmentDetail },
  { path: "/admin/stock-opname", Page: StockOpname },
  { path: "/admin/stock-opname/:opnameId", Page: StockOpnameDetail },
];
