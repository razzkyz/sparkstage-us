import { useMemo } from 'react';
import { useEffectiveTicketAvailability } from '../../hooks/useEffectiveTicketAvailability';
import { useEntranceTicket } from '../../hooks/useEntranceTicket';
import { useTicketBookingSettings } from '../../hooks/useTicketBookingSettings';
import { useBookingSelectionState } from '../booking/useBookingSelectionState';
import type { JourneySelectionController } from './journeySelectionTypes';

export function useJourneySelectionController(): JourneySelectionController {
  const { data: ticket, error: ticketError, isLoading: ticketLoading } = useEntranceTicket('public');
  const {
    data: bookingSettings,
    error: settingsError,
    isLoading: settingsLoading,
  } = useTicketBookingSettings(ticket?.id ?? null);
  // Minimum 90 days so the RPC fetches the full 3-month range
  const effectiveWindowDays = Math.max(bookingSettings?.booking_window_days ?? 90, 90);
  const {
    data: availabilities = [],
    error: availabilityError,
    isLoading: availabilityLoading,
  } = useEffectiveTicketAvailability(ticket?.id ?? null, effectiveWindowDays);

  const selection = useBookingSelectionState({
    ticket,
    availabilities,
    max_tickets_per_booking: bookingSettings?.max_tickets_per_booking,
    // Minimum 90 days (≈3 months) regardless of DB setting
    booking_window_days: Math.max(bookingSettings?.booking_window_days ?? 90, 90),
  });

  const error = useMemo(() => {
    const candidate = ticketError || settingsError || availabilityError;
    return candidate instanceof Error ? candidate : null;
  }, [availabilityError, settingsError, ticketError]);

  return {
    ticket: ticket ?? null,
    availabilities,
    loading: ticketLoading || settingsLoading || availabilityLoading,
    error,
    currentDate: selection.currentDate,
    selectedDate: selection.selectedDate,
    selectedTime: selection.selectedTime,
    calendarDays: selection.calendarDays,
    availableTimeSlots: selection.availableTimeSlots,
    groupedSlots: selection.groupedSlots,
    hasBookableDates: selection.hasBookableDates,
    isAllDayTicket: selection.isAllDayTicket,
    today: selection.today,
    maxBookingDate: selection.maxBookingDate,
    canGoPrevMonth: selection.canGoPrevMonth,
    canGoNextMonth: selection.canGoNextMonth,
    monthName: selection.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    setSelectedDate: (date) => {
      if (!date) return;
      selection.handleSelectDate(date);
    },
    setSelectedTime: selection.setSelectedTime,
    handlePrevMonth: selection.handlePrevMonth,
    handleNextMonth: selection.handleNextMonth,
    getMinutesUntilClose: selection.getMinutesUntilClose,
    getSlotUrgency: selection.getSlotUrgency,
  };
}
