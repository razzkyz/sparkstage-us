import { useCallback, useEffect, useRef, useState } from "react";
import { StageQrScannerModal } from "./StageQrScannerModal";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
// import Logo from "./Logo";
import {
  Camera,
  CalendarDays,
  Newspaper,
  LogOut,
  Menu,
  ReceiptText,
  ShoppingCart,
  ShoppingBag,
  Ticket,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  to: string;
  isPink?: boolean;
  icon?: LucideIcon;
};
// import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from "../contexts/AuthContext";
import { useTicketCount } from "../hooks/useTicketCount";
import { useOrderCount } from "../hooks/useOrderCount";
import { useCart } from "../contexts/cartStore";
import {
  useLoyaltyPoints,
  getLoyaltyRankByTier,
} from "../hooks/useLoyaltyPoints";
import { getUserDisplayName } from "../utils/auth";

const Navbar = () => {
  const { t } = useTranslation();
  const { user, signOut, isAdmin, loggingOut } = useAuth();
  const { count: ticketCount } = useTicketCount();
  const { count: orderCount } = useOrderCount();
  const { totalQuantity } = useCart();
  const { data: loyaltyData } = useLoyaltyPoints(user?.id);
  const loyaltyPoints = loyaltyData?.total_points ?? 0;
  const loyaltyTier = loyaltyData?.tier_level ?? 0;
  const loyaltyRank = getLoyaltyRankByTier(loyaltyTier);
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const desktopNavItemsRef = useRef<
    (HTMLAnchorElement | HTMLButtonElement | null)[]
  >([]);
  const mobileNavScrollerRef = useRef<HTMLDivElement | null>(null);
  const desktopNavContainerRef = useRef<HTMLDivElement | null>(null);

  const hasCenteredMobileItemRef = useRef(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeNavKey = (() => {
    const path = location.pathname;
    if (path === "/") return "on-stage";
    if (path.startsWith("/on-stage")) return "on-stage";
    if (path.startsWith("/events")) return "event";
    if (
      path.startsWith("/shop") ||
      path.startsWith("/glam") ||
      path.startsWith("/beauty") ||
      path.startsWith("/charm-bar") ||
      path.startsWith("/chamr-bar")
    )
      return "shop";
    // if (path.startsWith("/dressing-room") || path.startsWith("/fashion"))
      return "dressing-room";
    if (path.startsWith("/news")) return "news";
    if (path.startsWith("/booking")) return "booking";
    return "";
  })();

  const navItems: NavItem[] = [
    { key: "on-stage", label: "ON STAGE", to: "/on-stage", icon: Camera },
    {
      key: "booking",
      label: "BOOKING",
      to: "/booking",
      isPink: true,
      icon: Ticket,
    },
    // { key: "dressing-room", label: "FASHION ON DEMAND", to: "/dressing-room" },
    { key: "shop", label: "SHOP", to: "/shop", icon: ShoppingBag },
    { key: "event", label: "EVENT", to: "/events", icon: CalendarDays },
    { key: "news", label: "NEWS", to: "/news", icon: Newspaper },
  ];

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.key === activeNavKey),
  );
  // const isIndonesian = currentLanguage.startsWith('id');

  const centerMobileActiveItem = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const scroller = mobileNavScrollerRef.current;
      const activeItem = desktopNavItemsRef.current[activeIndex];
      if (!scroller || !activeItem) return;

      const doScroll = () => {
        const s = mobileNavScrollerRef.current;
        const a = desktopNavItemsRef.current[activeIndex];
        if (!s || !a) return;

        const maxScrollLeft = Math.max(0, s.scrollWidth - s.clientWidth);
        const centeredLeft = a.offsetLeft - (s.clientWidth - a.offsetWidth) / 2;
        const clampedLeft = Math.min(maxScrollLeft, Math.max(0, centeredLeft));
        try {
          s.scrollTo({
            left: clampedLeft,
            behavior: behavior === "auto" ? ("instant" as any) : behavior,
          });
        } catch {
          // Safari fallback: scrollTo with options may throw in very old versions
          s.scrollLeft = clampedLeft;
        }
      };

      // Safari iOS needs a layout flush before offsetLeft is accurate.
      // Double-rAF ensures the browser has painted at least one frame.
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
    },
    [activeIndex],
  );

  useEffect(() => {
    const behavior: ScrollBehavior = hasCenteredMobileItemRef.current
      ? "smooth"
      : "auto";
    centerMobileActiveItem(behavior);
    hasCenteredMobileItemRef.current = true;
  }, [centerMobileActiveItem]);

  useEffect(() => {
    const onResize = () => {
      centerMobileActiveItem("auto");
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [centerMobileActiveItem]);

  // const handleMobileLanguageToggle = () => {
  //   void i18n.changeLanguage(isIndonesian ? 'en' : 'id');
  // };

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleSignOutConfirm = async () => {
    if (loggingOut) return;
    setShowLogoutConfirm(false);
    const { error } = await signOut();
    if (!error) {
      navigate("/login");
    }
  };

  const handleSignOutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      {/* ── Sticky Header Wrapper (Top Bar + Desktop Nav) ── */}
      <div
        className={`sticky top-0 z-[110] bg-white transition-shadow duration-300 ${scrolled ? "shadow-[0_4px_16px_rgba(0,0,0,0.08)]" : ""}`}
      >
        {/* Top Bar */}
        <div className="border-b border-gray-200 lg:border-b-3 lg:border-main-500">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-2 lg:py-1">
              <div className="w-1/3 flex items-center gap-3">
                {/* Desktop: Stage 55 logo + Loyalty Points (jika login) */}
                <Link to="/" className="hidden lg:flex items-center">
                  {/* <Logo className="h-[2.5rem] md:h-[3.5rem]" /> */}
                  <img
                    src="/images/landing/HeaderLogo.webp"
                    alt="Stage 55"
                    className="h-15 w-auto md:h-18 object-contain "
                    fetchPriority="high"
                    width={150}
                    height={48}
                  />
                  <img
                    src="/images/landing/stage55.png"
                    alt="Stage 55"
                    className="h-10 w-auto md:h-12 object-contain "
                    fetchPriority="high"
                    width={150}
                    height={48}
                  />
                </Link>
                {/* Mobile/Tablet: Hamburger */}
                <div className="lg:hidden flex items-center">
                  {/* Hamburger button — triggers left sidebar */}
                  <button
                    id="navbar-hamburger-btn"
                    type="button"
                    aria-label="Buka menu navigasi"
                    aria-expanded={sidebarOpen}
                    aria-controls="mobile-sidebar"
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 -ml-1 rounded-xl bg-gray-50/80 text-black  hover:text-[#ff4b86] hover:text-pink  hover:shadow-md active:bg-pink-100 transition-all duration-300 active:scale-90"
                  >
                    <Menu className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <div className="w-1/3 flex justify-center lg:hidden">
                <Link
                  to="/"
                  className="inline-flex items-center"
                  aria-label="Home"
                >
                  <img
                    src="/images/landing/HeaderLogo.webp"
                    alt="Stage 55"
                    className="h-[4rem] md:h-[5rem] w-auto object-cover"
                    fetchPriority="high"
                    width={200}
                    height={64}
                  />
                  <img
                    src="/images/landing/stage55.png"
                    alt="Stage 55"
                    className="h-[2.5rem] md:h-[3.5rem] w-auto object-contain"
                    fetchPriority="high"
                    width={150}
                    height={48}
                  />
                </Link>
              </div>

              <div className="ml-auto w-1/3 flex items-center justify-end gap-3 lg:gap-4">
                {/* Desktop icons — selalu tampil */}
                <div className="hidden lg:flex items-center gap-3">
                  {/* QR Scanner button — temporarily disabled */}
                  {false && user && (
                    <button
                      id="navbar-qr-scanner-btn"
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      title="Scan Stage QR"
                      aria-label="Scan Stage QR Code"
                      className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 active:scale-90 hover:scale-105 hover:shadow-lg hover:shadow-pink-400/40 flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #ff2d72 0%, #ff4b86 60%, #ff6b9d 100%)",
                        boxShadow: "0 2px 8px rgba(255,75,134,0.45)",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      >
                        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                        <rect x="7" y="7" width="3" height="3" />
                        <rect x="14" y="7" width="3" height="3" />
                        <rect x="7" y="14" width="3" height="3" />
                        <path d="M14 14h3v3" />
                      </svg>
                    </button>
                  )}
                  {user ? (
                    <>
                      <span className="text-sm font-medium text-gray-900">
                        {getUserDisplayName(user)}
                      </span>

                      {isAdmin && (
                        <Link
                          to="/admin/dashboard"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#ff4b86] text-white rounded-md hover:bg-[#e63d75] transition-colors shadow-sm"
                          title="Admin Dashboard"
                        >
                          <span className="material-symbols-outlined text-sm">
                            dashboard
                          </span>
                          Dashboard
                        </Link>
                      )}

                      <button
                        onClick={handleSignOutClick}
                        disabled={loggingOut}
                        className="text-gray-600 hover:text-primary transition-colors cursor-pointer"
                        title={t("auth.signOut")}
                      >
                        <LogOut className="h-5 w-5" />
                      </button>
                    </>
                  ) : null}

                  {/* Loyalty Points Badge — hanya saat login */}
                  {user && (
                    <Link
                      to="/my-points"
                      className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-400/40"
                      style={{
                        background:
                          "linear-gradient(135deg, #ff2d72 0%, #ff4b86 50%, #ff6b9d 100%)",
                        boxShadow: "0 2px 10px rgba(255,75,134,0.4)",
                      }}
                      title={`SPARK CLUB · ${loyaltyRank.label} · ${loyaltyPoints.toLocaleString()} poin`}
                    >
                      <span className="text-sm leading-none">
                        {loyaltyRank.icon}
                      </span>
                      <span className="text-xs font-black tracking-tight text-white">
                        {loyaltyPoints.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-bold text-white/70 uppercase tracking-wide">
                        pts
                      </span>
                      <span
                        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                        }}
                      />
                    </Link>
                  )}

                  {/* Cart, My Tickets, My Orders — selalu tampil di desktop */}
                  <Link
                    to="/my-tickets"
                    className="relative text-gray-600 hover:text-main-600 transition-colors"
                    title={t("nav.myTickets")}
                  >
                    <Ticket className="h-5 w-5" />
                    {ticketCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {ticketCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/my-orders"
                    className="relative text-gray-600 hover:text-main-600 transition-colors hidden"
                    title={t("nav.myOrders")}
                  >
                    <ReceiptText className="h-5 w-5" />
                    {orderCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {orderCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/cart"
                    className="relative text-gray-600 hover:text-main-600 transition-colors"
                    aria-label={t("nav.cart")}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {totalQuantity > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {totalQuantity}
                      </span>
                    )}
                  </Link>

                  {/* Profile — hanya tampil saat login */}
                  {user ? (
                    <Link
                      to="/profile"
                      className="text-gray-600 hover:text-primary transition-colors"
                      title="Profile"
                    >
                      <UserRound className="h-5 w-5" />
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="relative text-gray-600 hover:text-main-600 transition-colors"
                      aria-label={t("auth.signIn")}
                      title={t("auth.signIn")}
                    >
                      <UserRound className="h-5 w-5" />
                    </Link>
                  )}
                </div>

                <div className="lg:hidden flex items-center gap-3">
                  {/* Mobile: QR Scanner button — temporarily disabled */}
                  {false && user && (
                    <button
                      id="navbar-qr-scanner-btn-mobile"
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      aria-label="Scan Stage QR Code"
                      className="relative  flex items-center justify-center w-8 h-8 rounded-xl active:scale-90 transition-all duration-200 flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #ff2d72 0%, #ff4b86 60%, #ff6b9d 100%)",
                        boxShadow: "0 2px 8px rgba(255,75,134,0.45)",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      >
                        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                        <rect x="7" y="7" width="3" height="3" />
                        <rect x="14" y="7" width="3" height="3" />
                        <rect x="7" y="14" width="3" height="3" />
                        <path d="M14 14h3v3" />
                      </svg>
                    </button>
                  )}
                  {/* Mobile: Ticket icon */}

                  <Link
                    to="/my-tickets"
                    className="relative text-gray-600 hover:text-main-600 transition-colors"
                    aria-label={t("nav.myTickets")}
                    title={t("nav.myTickets")}
                  >
                    <Ticket className="h-5 w-5" />
                    {ticketCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {ticketCount}
                      </span>
                    )}
                  </Link>

                  {/* Mobile: Orders icon */}

                  <Link
                    to="/my-orders"
                    className="relative text-gray-600 hover:text-main-600 transition-colors hidden"
                    aria-label={t("nav.myOrders")}
                    title={t("nav.myOrders")}
                  >
                    <ReceiptText className="h-5 w-5" />
                    {orderCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                        {orderCount}
                      </span>
                    )}
                  </Link>

                  {/* Mobile: Cart */}

                  <Link
                    to="/cart"
                    className="relative text-gray-600 hover:text-main-600 transition-colors"
                    aria-label={t("nav.cart")}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {totalQuantity > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-main-600 text-white text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full">
                        {totalQuantity}
                      </span>
                    )}
                  </Link>

                  {/* Mobile: Profile/Login — kondisional berdasarkan status login */}
                  {user ? (
                    <Link
                      to="/profile"
                      className="relative text-gray-600 hover:text-main-600 transition-colors hidden"
                      aria-label="Profile"
                      title="Profile"
                    >
                      <UserRound className="h-5 w-5" />
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="relative text-gray-600 hover:text-main-600 transition-colors"
                      aria-label={t("auth.signIn")}
                      title={t("auth.signIn")}
                    >
                      <UserRound className="h-5 w-5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation - Desktop (inside sticky wrapper) */}
        <nav className="hidden py-0.5 lg:block w-full relative bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Star positioned relative to this wrapper */}
            <div
              ref={desktopNavContainerRef}
              className="flex justify-center items-center relative "
            >
              {/* Nav items — equal-width grid so the middle item is always centred */}
              <div
                ref={mobileNavScrollerRef}
                className="grid relative z-10 w-3/5 "
                style={{
                  gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
                }}
              >
                {navItems.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const Icon = item.icon;
                  const isDisabled = item.key === "dressing-room";

                  if (isDisabled) {
                    return (
                      <button
                        key={item.key}
                        ref={(el) => (desktopNavItemsRef.current[idx] = el)}
                        disabled
                        className="text-sm font-medium px-2 py-2 transition-colors flex items-center justify-center gap-2 z-10 relative whitespace-nowrap text-gray-400 cursor-not-allowed opacity-50 hover:opacity-50"
                      >
                        {Icon && item.key === "booking" && (
                          <div className="bg-main-500 rounded-full p-1">
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {item.label}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.key}
                      ref={(el) => (desktopNavItemsRef.current[idx] = el)}
                      to={item.to}
                      className={`text-sm font-medium px-2 py-2 transition-colors flex items-center justify-center gap-2 z-10 relative whitespace-nowrap ${
                        isActive
                          ? "text-main-500"
                          : "text-black hover:text-main-500"
                      }`}
                    >
                      {Icon && item.key === "booking" && (
                        <div className="bg-main-500 rounded-full p-1">
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      </div>
      {/* end sticky wrapper */}

      {/* ── Mobile / Tablet Sidebar Drawer ────────────────────────────── */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
        className={`lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] transition-opacity duration-300 ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer panel */}
      <aside
        id="mobile-sidebar"
        aria-label="Menu navigasi"
        className={`lg:hidden fixed top-0 left-0 h-full w-[280px] max-w-[85vw] bg-white z-[210] flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div
          className={`flex items-center px-5 py-4 border-b border-gray-100 ${user ? "justify-between" : "justify-end"}`}
        >
          {/* Close button — kiri saat tidak login, kanan saat login */}
          {!user && (
            <button
              id="sidebar-close-btn"
              type="button"
              aria-label="Tutup menu"
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-500 hover:text-[#ff4b86] hover:bg-pink-50 active:bg-pink-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {user && (
            <div className="">
              {/* User info row */}
              <div className="flex items-center gap-3">
                {/* Avatar initial */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-black"
                  style={{
                    background: "linear-gradient(135deg, #ff2d72, #ff6b9d)",
                  }}
                >
                  {getUserDisplayName(user).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {getUserDisplayName(user)}
                  </p>
                  {/* Points badge */}
                  <Link
                    to="/my-points"
                    onClick={() => setSidebarOpen(false)}
                    className="inline-flex items-center gap-1 mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide active:scale-95 transition-transform"
                    style={{
                      background: "linear-gradient(135deg, #ff2d72, #ff6b9d)",
                      color: "white",
                    }}
                  >
                    <span>{loyaltyRank.icon}</span>
                    <span>{loyaltyPoints.toLocaleString()}</span>
                    <span className="opacity-70 font-semibold text-[9px]">
                      pts
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}
          {user && (
            <button
              id="sidebar-close-btn"
              type="button"
              aria-label="Tutup menu"
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-500 hover:text-[#ff4b86] hover:bg-pink-50 active:bg-pink-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item, idx) => {
            const isActive = idx === activeIndex;
            const Icon = item.icon;
            const isDisabled = item.key === "dressing-room";

            if (isDisabled) {
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-5 py-2.5 transition-colors opacity-50 cursor-not-allowed hover:opacity-50"
                >
                  <button
                    disabled
                    className="flex-1 flex items-center gap-3 py-1 text-sm font-bold uppercase tracking-wider text-gray-400 cursor-not-allowed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gray-300" />
                    {item.label}
                  </button>
                </div>
              );
            }

            if (item.key === "shop") {
              return (
                <div key={item.key} className="flex flex-col">
                  <div
                    className={`flex items-center justify-between px-5 py-2.5 transition-colors ${
                      isActive
                        ? "bg-pink-50 border-r-4 border-[#ff4b86]"
                        : "hover:bg-pink-50/60"
                    }`}
                  >
                    <Link
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex-1 flex items-center gap-3 py-1 text-sm font-bold uppercase tracking-wider ${isActive ? "text-[#ff4b86]" : "text-gray-700 hover:text-[#ff4b86]"}`}
                    >
                      {Icon ? (
                        <div className="bg-main-500 rounded-full p-1 flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-[#ff4b86]" : "bg-gray-300"}`}
                        />
                      )}
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShopDropdownOpen(!shopDropdownOpen);
                      }}
                      className="p-1.5 rounded-md text-gray-500 hover:text-[#ff4b86] hover:bg-pink-100 transition-colors"
                    >
                      <svg
                        className={`w-5 h-5 transform transition-transform ${shopDropdownOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                  {/* Dropdown Items */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${shopDropdownOpen ? "max-h-48" : "max-h-0"}`}
                  >
                    <div className="bg-gray-50 flex flex-col py-1.5 border-y border-gray-100">
                      <Link
                        to="/glam"
                        onClick={() => setSidebarOpen(false)}
                        className="px-12 py-2.5 text-xs font-bold text-gray-600 hover:text-[#ff4b86] uppercase tracking-wider"
                      >
                        Glam Room
                      </Link>
                      <Link
                        to="/charm-bar"
                        onClick={() => setSidebarOpen(false)}
                        className="px-12 py-2.5 text-xs font-bold text-gray-600 hover:text-[#ff4b86] uppercase tracking-wider"
                      >
                        Charm Bar
                      </Link>
                      <Link
                        to="/shop"
                        onClick={() => setSidebarOpen(false)}
                        className="px-12 py-2.5 text-xs font-bold text-gray-600 hover:text-[#ff4b86] uppercase tracking-wider"
                      >
                        Spark Club
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-5 py-3.5 text-sm font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? "text-[#ff4b86] bg-pink-50 border-r-4 border-[#ff4b86]"
                    : "text-gray-700 hover:text-[#ff4b86] hover:bg-pink-50/60"
                }`}
              >
                {Icon ? (
                  <div className="bg-main-500 rounded-full p-1 flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isActive ? "bg-[#ff4b86]" : "bg-gray-300"
                    }`}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer — user profile */}
        {user && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <>
              {/* Admin Dashboard button */}
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold text-white transition-colors active:scale-95"
                  style={{ background: "#ff4b86" }}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    dashboard
                  </span>
                  Dashboard Admin
                </Link>
              )}

              {/* Profile Link */}
              <Link
                to="/profile"
                onClick={() => setSidebarOpen(false)}
                className="flex w-full items-center gap-3 py-2 text-sm font-semibold text-gray-500 hover:text-[#ff4b86] transition-colors"
              >
                <UserRound className="h-4 w-4 flex-shrink-0" />
                Profile
              </Link>

              {/* Sign Out */}
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen(false);
                  handleSignOutClick();
                }}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 py-2 text-sm font-semibold text-gray-500 hover:text-[#ff4b86] transition-colors disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                {t("auth.signOut")}
              </button>
            </>
          </div>
        )}
      </aside>

      {/* Stage QR Scanner Modal */}
      <StageQrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />

      {showLogoutConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={handleSignOutCancel}
          >
            <div
              className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full md:max-w-sm md:w-full p-6 space-y-5 animate-slide-up md:animate-none"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
                  <LogOut className="h-8 w-8 text-[#ff4b86]" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wider text-gray-900">
                    {t("auth.signOut")}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    {t("auth.signOutConfirm")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <button
                  onClick={handleSignOutCancel}
                  className="flex-1 px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors order-2 md:order-1"
                  type="button"
                >
                  {t("auth.cancel")}
                </button>
                <button
                  onClick={handleSignOutConfirm}
                  disabled={loggingOut}
                  className="flex-1 px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white bg-[#ff4b86] hover:bg-[#e63d75] active:bg-[#cc2f64] rounded-xl transition-colors disabled:opacity-50 order-1 md:order-2"
                  type="button"
                >
                  {t("auth.confirm")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
