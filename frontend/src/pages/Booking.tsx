import { useState, useMemo, useEffect, useRef } from "react";
import useSeo from "../hooks/useSeo";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toLocalDateString } from "../utils/timezone";
import {
  DEFAULT_BOOKING_PAGE_SETTINGS,
  useBookingPageSettings,
} from "../hooks/useBookingPageSettings";
import { JourneyCalendarSection } from "./journey-selection/JourneyCalendarSection";
import { JourneySummaryCard } from "./journey-selection/JourneySummaryCard";
import { JourneyTimeSlotsSection } from "./journey-selection/JourneyTimeSlotsSection";
import { useJourneySelectionController } from "./journey-selection/useJourneySelectionController";
import { AppLoadingScreen } from "../app/AppLoadingScreen";
import { useBanners } from "../hooks/useBanners";
import { VenueReviews } from "../components/VenueReviews";
import { useToast } from "../components/Toast";
import { BookingTermsModal } from "./booking/BookingTermsModal";

const Booking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings: bookingSettings } = useBookingPageSettings();
  const bookingCopy = bookingSettings ?? DEFAULT_BOOKING_PAGE_SETTINGS;
  const { showToast } = useToast();
  const [showTermsModal, setShowTermsModal] = useState(false);

  const {
    ticket,
    loading: journeyLoading,
    error: journeyError,
    selectedDate,
    selectedTime,
    calendarDays,
    availableTimeSlots,
    groupedSlots,
    hasBookableDates,
    isAllDayTicket,
    canGoPrevMonth,
    canGoNextMonth,
    monthName,
    setSelectedDate,
    setSelectedTime,
    handlePrevMonth,
    handleNextMonth,
    getMinutesUntilClose,
    getSlotUrgency,
  } = useJourneySelectionController();

  const { data: sparkMapBanners = [], isLoading: sparkMapLoading } =
    useBanners("spark-map");
  const sparkMap = sparkMapBanners[0];

  useSeo({
    title: "SparkStage Booking · Stage 55",
    description: `Book Stage 55 journeys and experiences with SparkStage Booking. ${bookingCopy.journey_description}`,
    canonical: `${window.location.origin}/booking`,
  });

  const [currentIndex, setCurrentIndex] = useState(1);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);

  const processCarouselRef = useRef<HTMLElement>(null);
  const processTitleRef = useRef<HTMLDivElement>(null);
  const processTouchStartX = useRef<number>(0);
  const processTouchEndX = useRef<number>(0);

  const { data: processBanners = [] } = useBanners("process");

  const activeRealIndex = useMemo(() => {
    if (processBanners.length <= 1) return 0;
    if (currentIndex === 0) return processBanners.length - 1;
    if (currentIndex === processBanners.length + 1) return 0;
    return currentIndex - 1;
  }, [currentIndex, processBanners.length]);

  const slidesToRender = useMemo(() => {
    if (processBanners.length === 0) return [];
    if (processBanners.length === 1) return processBanners;
    return [
      processBanners[processBanners.length - 1],
      ...processBanners,
      processBanners[0],
    ];
  }, [processBanners]);

  const nextSlide = () => {
    if (!isTransitionEnabled) return;
    setCurrentIndex((prev) => prev + 1);
  };

  const prevSlide = () => {
    if (!isTransitionEnabled) return;
    setCurrentIndex((prev) => prev - 1);
  };

  const handleTransitionEnd = () => {
    if (currentIndex === 0) {
      setIsTransitionEnabled(false);
      setCurrentIndex(processBanners.length);
    } else if (currentIndex === processBanners.length + 1) {
      setIsTransitionEnabled(false);
      setCurrentIndex(1);
    }
  };

  useEffect(() => {
    if (!isTransitionEnabled) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitionEnabled(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitionEnabled]);

  // Process banner auto-slide timer
  useEffect(() => {
    if (processBanners.length <= 1) return;
    const interval = setInterval(() => {
      setIsTransitionEnabled(true);
      setCurrentIndex((prev) => prev + 1);
    }, 8000);
    return () => clearInterval(interval);
  }, [processBanners.length, activeRealIndex]);

  // Called after terms agreed — does the actual navigation.
  const navigateToPayment = () => {
    if (!ticket || !selectedDate) return;
    navigate("/payment", {
      state: {
        ticketId: ticket.id,
        ticketName: ticket.name,
        ticketType: ticket.type,
        price: parseFloat(ticket.price),
        date: toLocalDateString(selectedDate),
        time: selectedTime || "all-day",
      },
    });
  };

  // Validates selection then opens the terms modal.
  const handleProceedToPayment = () => {
    if (!ticket || !selectedDate) {
      showToast("pink", "Silakan pilih tanggal terlebih dahulu");
      return;
    }
    const isAllDay = isAllDayTicket && !selectedTime;
    if (!isAllDay && !selectedTime) {
      showToast("pink", "Silakan pilih sesi terlebih dahulu");
      return;
    }
    if (!user) {
      showToast("pink", "Silakan login terlebih dahulu");
      navigate("/login", { state: { returnTo: "/booking" } });
      return;
    }
    // All checks passed — show terms & conditions modal
    setShowTermsModal(true);
  };

  if (journeyLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Banner OnStage Dinonaktikan*/}
      {processBanners.length > 0 && (
        <section
          ref={processCarouselRef}
          className="w-full relative overflow-hidden bg-white mb-16"
        >
          {(processBanners[activeRealIndex]?.title_image_url ||
            processBanners[activeRealIndex]?.title) && (
            <div
              ref={processTitleRef}
              className="flex justify-center mb-8 md:mb-10 h-24 md:h-32 lg:h-40 transition-all duration-500 text-center relative z-20 px-4"
            >
              {processBanners[activeRealIndex]?.title_image_url ? (
                <img
                  src={processBanners[activeRealIndex].title_image_url!}
                  alt={
                    processBanners[activeRealIndex].title ||
                    "Process Title Typography"
                  }
                  className="h-full w-auto object-contain animate-fade-in drop-shadow-lg hover:drop-shadow-xl transition-all"
                />
              ) : (
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-black self-center animate-fade-in uppercase pt-4">
                  {processBanners[activeRealIndex].title}
                </h2>
              )}
            </div>
          )}

          {/* Carousel Container */}
          <div className="relative w-full lg:px-16 xl:px-24">
            <div
              className="overflow-hidden w-full relative rounded-none"
              onTouchStart={(e) => {
                processTouchStartX.current = e.touches[0].clientX;
              }}
              onTouchMove={(e) => {
                processTouchEndX.current = e.touches[0].clientX;
              }}
              onTouchEnd={() => {
                const swipeThreshold = 50;
                const diff =
                  processTouchStartX.current - processTouchEndX.current;
                if (Math.abs(diff) > swipeThreshold) {
                  if (diff > 0) nextSlide();
                  else prevSlide();
                }
              }}
            >
              <div
                className="flex"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                  transition: isTransitionEnabled
                    ? "transform 700ms ease-in-out"
                    : "none",
                }}
                onTransitionEnd={handleTransitionEnd}
              >
                {slidesToRender.map((processBanner, idx) => (
                  <div
                    key={`${processBanner.id}-${idx}`}
                    className="w-full shrink-0"
                  >
                    <Link
                      to={processBanner.link_url || "#"}
                      className={`block w-full h-full ${!processBanner.link_url ? "cursor-default pointer-events-none" : ""}`}
                    >
                      {/* Process Image */}
                      <div className="relative w-full bg-gray-100 dark:bg-gray-900 group overflow-hidden">
                        {processBanner.image_url?.match(
                          /\.(mp4|webm|ogg)(\?.*)?$/i,
                        ) ? (
                          <video
                            src={processBanner.image_url}
                            className="w-full h-auto object-contain pointer-events-none transition-transform duration-500 group-hover:scale-105"
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={processBanner.image_url}
                            alt={processBanner.title || "Process visual"}
                            className="w-full h-auto object-contain pointer-events-none transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>

                      {/* Process Subtitle Text */}
                      {processBanner.subtitle && (
                        <div className="p-6 md:p-8 text-center bg-white">
                          <p className="text-black font-bold uppercase tracking-widest md:text-2xl leading-relaxed whitespace-pre-wrap">
                            {processBanner.subtitle}
                          </p>
                        </div>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons for Process Carousel */}
            {processBanners.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevSlide}
                  className="absolute left-2 md:left-6 top-[40%] -translate-y-1/2 z-10 bg-black/50 hover:bg-gray-800/80 active:bg-black/50 text-white p-3 md:p-4 rounded-full shadow-lg transition-all touch-manipulation hover:scale-110 active:scale-95"
                >
                  <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="absolute right-2 md:right-6 top-[40%] -translate-y-1/2 z-10 bg-black/50 hover:bg-gray-800/80 active:bg-black/50 text-white p-3 md:p-4 rounded-full shadow-lg transition-all touch-manipulation hover:scale-110 active:scale-95"
                >
                  <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              </>
            )}
          </div>

          {/* Process Carousel Indicators */}
          {processBanners.length > 1 && (
            <div className="flex justify-center gap-3 mt-2">
              {processBanners.map((_, idx) => (
                <button
                  key={`process-dot-${idx}`}
                  type="button"
                  onClick={() => {
                    setIsTransitionEnabled(true);
                    setCurrentIndex(idx + 1);
                  }}
                  className={`rounded-full touch-manipulation transition-all duration-300 ${
                    activeRealIndex === idx
                      ? "bg-pink-500 w-10 h-2"
                      : "bg-gray-300 hover:bg-gray-400 w-2 h-2 hover:scale-125"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}
      {/* Header */}
      <section className="py-12 px-6 md:px-12 lg:px-20 border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-4 text-gray-900">
            {bookingCopy.journey_title}
          </h1>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl">
            {bookingCopy.journey_description}
          </p>
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left Column: Calendar & Time Slots */}
            <div className="lg:col-span-2 flex flex-col gap-8 md:gap-10">
              {journeyError || !ticket ? (
                <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 px-8 py-12 text-center text-amber-900 shadow-md">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-lg font-medium">
                    {journeyError?.message ||
                      "Entrance booking is unavailable right now."}
                  </p>
                </div>
              ) : (
                <>
                  {/* ⚠️ Booking reminder notice */}
                  <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      backgroundColor: "#fff8ed",
                      border: "1px solid #f5c97a",
                      borderRadius: "10px",
                      padding: "11px 15px",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "17px",
                        color: "#c87f00",
                        marginTop: "2px",
                        flexShrink: 0,
                      }}
                    >
                      warning
                    </span>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#7a4f00",
                        margin: 0,
                        lineHeight: "1.55",
                      }}
                    >
                      <strong>Perhatian!</strong> Pastikan memilih jadwal dan
                      tanggal yang benar,jangan sampai salah ya.{" "}
                      <em>See you in stage! 🌟</em>
                    </p>
                  </motion.div>

                  <JourneyCalendarSection
                    monthName={monthName}
                    canGoPrevMonth={canGoPrevMonth}
                    canGoNextMonth={canGoNextMonth}
                    calendarDays={calendarDays}
                    selectedDate={selectedDate}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                  />

                  <JourneyTimeSlotsSection
                    copy={bookingCopy}
                    selectedDate={selectedDate}
                    hasBookableDates={hasBookableDates}
                    isAllDayTicket={isAllDayTicket}
                    selectedTime={selectedTime}
                    availableSlotsCount={availableTimeSlots.length}
                    groupedSlots={groupedSlots}
                    onSelectTime={setSelectedTime}
                    getMinutesUntilClose={getMinutesUntilClose}
                    getSlotUrgency={getSlotUrgency}
                  />
                </>
              )}
            </div>

            {/* Right Column: Spark Map + Booking Summary */}
            <div className="flex flex-col gap-6">
              {/* Spark Map */}
              {sparkMapLoading ? (
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-lg border border-gray-200 p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-main-200 border-t-main-600" />
                </div>
              ) : sparkMap ? (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 lg:p-8 group hover:shadow-2xl transition-all duration-300">
                  <h3 className="text-2xl md:text-3xl font-black mb-6 italic text-gray-900">
                    {sparkMap.title || "Spark Map"}
                  </h3>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-gray-100 to-gray-200">
                    {sparkMap.image_url?.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                      <video
                        src={sparkMap.image_url}
                        className="w-full rounded-lg object-contain transition-transform duration-500 group-hover:scale-110"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={sparkMap.image_url}
                        alt={sparkMap.title || "Spark Stage 55 Map"}
                        className="w-full rounded-lg object-contain transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                  </div>
                </div>
              ) : null}

              {/* Booking Summary */}
              {ticket && (
                <JourneySummaryCard
                  copy={bookingCopy}
                  ticket={ticket}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  isAllDayTicket={isAllDayTicket}
                  onProceed={handleProceedToPayment}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Venue Reviews Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-16 md:py-24">
        <VenueReviews />
      </section>
      <BookingTermsModal
        open={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAgree={() => {
          setShowTermsModal(false);
          navigateToPayment();
        }}
      />
    </div>
  );
};

export default Booking;
