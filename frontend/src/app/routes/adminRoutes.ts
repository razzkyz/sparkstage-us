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
const DressingRoomDashboard = lazy(
  () => import("../../pages/admin/DressingRoomDashboard"),
);
const DressingRoomInventory = lazy(
  () => import("../../pages/admin/DressingRoomInventory"),
);
const DressingRoomProductList = lazy(
  () => import("../../pages/admin/DressingRoomProductList"),
);
const TicketsManagement = lazy(
  () => import("../../pages/admin/TicketsManagement"),
);
const StoreInventory = lazy(() => import("../../pages/admin/StoreInventory"));
const StageManager = lazy(() => import("../../pages/admin/StageManager"));
const DivisionManager = lazy(
  () => import("../../pages/admin/divisions/DivisionManager"),
);
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
const CharmBarPageManager = lazy(
  () => import("../../pages/admin/CharmBarPageManager"),
);
const BookingPageManager = lazy(
  () => import("../../pages/admin/BookingPageManager"),
);
const EntranceBookingManager = lazy(
  () => import("../../pages/admin/EntranceBookingManager"),
);
const DressingRoomManager = lazy(
  () => import("../../pages/admin/DressingRoomManager"),
);
const RentalOrders = lazy(() => import("../../pages/admin/RentalOrders"));
const DressingRoomScan = lazy(
  () => import("../../pages/admin/DressingRoomScanPage"),
);
const BeautyPosterManager = lazy(
  () => import("../../pages/admin/BeautyPosterManager"),
);
const EventBookings = lazy(() => import("../../pages/admin/EventBookings"));
const VenueReviewsAdmin = lazy(
  () => import("../../pages/admin/VenueReviewsAdmin"),
);
const TabletQRScanner = lazy(() => import("../../pages/admin/TabletQRScanner"));
const RentalScannerPage = lazy(() => import("../../pages/admin/RentalScannerPage"));
const SalesReport = lazy(() => import("../../pages/admin/SalesReport"));
const AuditLogsPage = lazy(() => import("../../pages/admin/AuditLogsPage"));
const AdminPointsManager = lazy(
  () => import("../../pages/admin/AdminPointsManager"),
);

const RetailProductManager = lazy(
  () => import("../../pages/admin/RetailProductManager"),
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
  { path: "/admin/dressing-room-dashboard", Page: DressingRoomDashboard },
  { path: "/admin/dressing-room-inventory", Page: DressingRoomInventory },
  { path: "/admin/dressing-room-products", Page: DressingRoomProductList },
  { path: "/admin/tickets", Page: TicketsManagement },
  { path: "/admin/store", Page: StoreInventory },
  { path: "/admin/stages", Page: StageManager },
  { path: "/admin/stage-analytics", Page: StageAnalytics },
  { path: "/admin/qr-bulk", Page: StageBulkQR },
  { path: "/admin/booking-page", Page: BookingPageManager },
  { path: "/admin/entrance-booking", Page: EntranceBookingManager },
  { path: "/admin/product-pickup", Page: ProductPickup },
  { path: "/admin/order-ticket", Page: OrderTicket },
  { path: "/admin/product-orders", Page: ProductOrders },
  { path: "/admin/vouchers", Page: VoucherManager },
  { path: "/admin/banner-manager", Page: BannerManager },
  { path: "/admin/events-schedule", Page: EventsScheduleManager },
  { path: "/admin/event-page", Page: EventPageManager },
  { path: "/admin/news-page", Page: NewsPageManager },
  { path: "/admin/charm-bar-page", Page: CharmBarPageManager },
  { path: "/admin/dressing-room", Page: DressingRoomManager },
  { path: "/admin/rental-orders", Page: RentalOrders },
  { path: "/admin/dressing-room-scan", Page: DressingRoomScan },
  { path: "/admin/glam-page", Page: BeautyPosterManager },
  { path: "/admin/event-bookings", Page: EventBookings },
  { path: "/admin/tablet-qr-scanner", Page: TabletQRScanner },
  { path: "/admin/rental-scanner", Page: RentalScannerPage },
  { path: "/admin/venue-reviews", Page: VenueReviewsAdmin },
  { path: "/admin/sales-report", Page: SalesReport },
  { path: "/admin/audit-logs", Page: AuditLogsPage },
  { path: "/admin/loyalty-points", Page: AdminPointsManager },
  { path: "/admin/divisions", Page: DivisionManager },
  { path: "/admin/retail-products", Page: RetailProductManager },
  { path: "/admin/sock-report", Page: StarGuideSockReport },
  { path: "/admin/stock-opening", Page: StockOpening },
  { path: "/admin/stock-opening/:openingId", Page: StockOpeningDetail },
  { path: "/admin/stock-adjustments", Page: StockAdjustments },
  { path: "/admin/stock-adjustments/:adjustmentId", Page: StockAdjustmentDetail },
  { path: "/admin/stock-opname", Page: StockOpname },
  { path: "/admin/stock-opname/:opnameId", Page: StockOpnameDetail },
];
