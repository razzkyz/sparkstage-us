import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DEFAULT_BOOKING_PAGE_SETTINGS,
  useBookingPageSettings,
} from "../hooks/useBookingPageSettings";
import { toLocalDateString, getMonthNameWIB } from "../utils/timezone";
import { useTickets } from "../hooks/useTickets";
import { useEffectiveTicketAvailability } from "../hooks/useEffectiveTicketAvailability";
import { useTicketBookingSettings } from "../hooks/useTicketBookingSettings";
import { useToast } from "../components/Toast";
import { PageTransition } from "../components/PageTransition";
import TicketCardSkeleton from "../components/skeletons/TicketCardSkeleton";
import { LazyMotion, m } from "framer-motion";
import { BookingCalendarPanel } from "./booking/BookingCalendarPanel";
import { BookingProgressHeader } from "./booking/BookingProgressHeader";
import { BookingSummarySidebar } from "./booking/BookingSummarySidebar";
import { BookingTimeSlotPanel } from "./booking/BookingTimeSlotPanel";
import { BookingUrgencyModal } from "./booking/BookingUrgencyModal";
import { BookingTermsModal } from "./booking/BookingTermsModal";
import { useBookingSelectionState } from "./booking/useBookingSelectionState";

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const { settings } = useBookingPageSettings();
  const bookingCopy = settings ?? DEFAULT_BOOKING_PAGE_SETTINGS;
  const {
    data: ticket,
    error: ticketError,
    isLoading: ticketLoading,
  } = useTickets(slug);
  const {
    data: bookingSettings,
    error: bookingSettingsError,
    isLoading: bookingSettingsLoading,
  } = useTicketBookingSettings(ticket?.id ?? null);
  const {
    data: availabilities = [],
    error: availabilityError,
    isLoading: availabilityLoading,
  } = useEffectiveTicketAvailability(
    ticket?.id ?? null,
    bookingSettings?.booking_window_days,
  );
  const loading =
    ticketLoading || bookingSettingsLoading || availabilityLoading;
  const error = ticketError || bookingSettingsError || availabilityError;
  const {
    currentDate,
    selectedDate,
    selectedTime,
    quantity,
    maxTickets,
    showUrgencyModal,
    calendarDays,
    availableTimeSlots,
    groupedSlots,
    isAllDayTicket,
    hasBookableDates,
    canGoPrevMonth,
    canGoNextMonth,
    getMinutesUntilClose,
    getSlotUrgency,
    setSelectedTime,
    setQuantity,
    setShowUrgencyModal,
    handlePrevMonth,
    handleNextMonth,
    handleSelectDate,
  } = useBookingSelectionState({
    ticket,
    availabilities,
    max_tickets_per_booking: bookingSettings?.max_tickets_per_booking,
    booking_window_days: bookingSettings?.booking_window_days,
  });

  useEffect(() => {
    if (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Failed to load booking data",
      );
    }
  }, [error, showToast]);

  // Called after terms are agreed — actually navigates to payment.
  const navigateToPayment = () => {
    if (!ticket || !selectedDate) return;
    navigate("/payment", {
      state: {
        ticketId: ticket.id,
        ticketName: ticket.name,
        ticketType: ticket.type,
        price: parseFloat(ticket.price),
        quantity,
        date: toLocalDateString(selectedDate),
        time: selectedTime || "all-day",
      },
    });
  };

  // Validates selection, handles urgency modal, then opens the terms modal.
  const handleProceedToPayment = () => {
    if (!ticket || !selectedDate) {
      alert("Please select a date");
      return;
    }

    // For all-day access tickets, time slot is optional
    const isAllDay = isAllDayTicket && !selectedTime;
    if (!isAllDay && !selectedTime) {
      alert("Please select a time slot");
      return;
    }

    // Check urgency level — show confirmation modal for high urgency slots first
    if (selectedTime) {
      const urgency = getSlotUrgency(selectedTime);
      if (urgency === "high" && !showUrgencyModal) {
        setShowUrgencyModal(true);
        return;
      }
    }

    // All checks passed — show terms & conditions modal
    setShowTermsModal(true);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="max-w-5xl w-full px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <TicketCardSkeleton />
            <TicketCardSkeleton />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error || !ticket) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              error
            </span>
            <p className="text-gray-500 text-lg mb-4">
              {error instanceof Error
                ? error.message
                : error || "Ticket not found"}
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-[#ff4b86] text-white px-6 py-2 rounded-lg hover:bg-[#e63d75] transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const price = parseFloat(ticket.price);
  const total = price * quantity;

  const monthName = getMonthNameWIB(currentDate);
  const selectedTimeMinutesLeft = selectedTime
    ? getMinutesUntilClose(selectedTime)
    : null;

  return (
    <PageTransition>
      <LazyMotion
        features={() => import("framer-motion").then((mod) => mod.domAnimation)}
      >
        <div className="min-h-screen bg-background-light">
          <main className="flex-1 max-w-[1200px] mx-auto w-full px-10 py-10">
            <BookingProgressHeader />

            <div className="mb-12">
              <h1 className="text-5xl font-black leading-tight tracking-[-0.033em] mb-4">
                {bookingCopy.reserve_title}
              </h1>
              <p className="text-[#9c4949]#d19a9a] text-lg max-w-2xl font-normal leading-normal">
                {ticket.description || bookingCopy.reserve_description}
              </p>
            </div>

            {/* ⚠️ Booking reminder notice */}
            <m.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                backgroundColor: "#fff8ed",
                border: "1px solid #f5c97a",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "24px",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "18px",
                  color: "#c87f00",
                  marginTop: "1px",
                  flexShrink: 0,
                }}
              >
                warning
              </span>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "#7a4f00",
                  margin: 0,
                  lineHeight: "1.55",
                }}
              >
                <strong>Perhatian!</strong> Pastikan memilih jadwal dan tanggal
                yang benar dan{" "}
                <strong
                  className="cursor-pointer hover:text-[#c87f00] hover:underline transition-colors duration-200"
                  onClick={() => setShowTermsModal(true)}
                >
                  membaca syarat dan ketentuan
                </strong>{" "}
                terlebih dahulu — jangan sampai salah ya.{" "}
                <em>See you in stage! 🌟</em>
              </p>
            </m.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 flex flex-col gap-10">
                <BookingCalendarPanel
                  title={bookingCopy.calendar_title}
                  monthName={monthName}
                  calendarDays={calendarDays}
                  selectedDate={selectedDate}
                  canGoPrevMonth={canGoPrevMonth}
                  canGoNextMonth={canGoNextMonth}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onSelectDate={handleSelectDate}
                />
                <BookingTimeSlotPanel
                  copy={bookingCopy}
                  selectedDate={selectedDate}
                  hasBookableDates={hasBookableDates}
                  isAllDayTicket={isAllDayTicket}
                  selectedTime={selectedTime}
                  availableTimeSlots={availableTimeSlots}
                  groupedSlots={groupedSlots}
                  getMinutesUntilClose={getMinutesUntilClose}
                  getSlotUrgency={getSlotUrgency}
                  onSelectTime={setSelectedTime}
                />
              </div>

              <BookingSummarySidebar
                copy={bookingCopy}
                ticket={ticket}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                isAllDayTicket={isAllDayTicket}
                quantity={quantity}
                maxTickets={maxTickets}
                price={price}
                total={total}
                getMinutesUntilClose={getMinutesUntilClose}
                getSlotUrgency={getSlotUrgency}
                onDecreaseQuantity={() =>
                  setQuantity((value) => Math.max(1, value - 1))
                }
                onIncreaseQuantity={() =>
                  setQuantity((value) => Math.min(maxTickets, value + 1))
                }
                onProceed={handleProceedToPayment}
              />
            </div>
          </main>

          <BookingUrgencyModal
            open={showUrgencyModal}
            selectedTime={selectedTime}
            minutesLeft={selectedTimeMinutesLeft}
            onClose={() => {
              setShowUrgencyModal(false);
              setSelectedTime(null);
            }}
            onConfirm={() => {
              setShowUrgencyModal(false);
              // After urgency confirmed, show terms before navigating
              setShowTermsModal(true);
            }}
          />

          <BookingTermsModal
            open={showTermsModal}
            onClose={() => setShowTermsModal(false)}
            onAgree={() => {
              setShowTermsModal(false);
              navigateToPayment();
            }}
          />
        </div>
      </LazyMotion>
    </PageTransition>
  );
}
