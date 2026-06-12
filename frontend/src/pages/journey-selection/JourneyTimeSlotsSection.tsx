import type { BookingPageSettings } from '../../hooks/useBookingPageSettings';
import type { GroupedTimeSlots } from './journeySelectionTypes';

type JourneyTimeSlotsSectionProps = {
  copy: Pick<
    BookingPageSettings,
    | 'time_slots_title'
    | 'empty_slots_message'
    | 'access_type_title'
    | 'all_day_access_label'
    | 'all_day_access_helper'
    | 'choose_specific_time_label'
  >;
  selectedDate: Date | null;
  hasBookableDates: boolean;
  isAllDayTicket: boolean;
  selectedTime: string | null;
  availableSlotsCount: number;
  groupedSlots: GroupedTimeSlots;
  onSelectTime: (time: string | null) => void;
  getMinutesUntilClose: (timeSlot: string) => number | null;
  getSlotUrgency: (timeSlot: string) => 'none' | 'low' | 'medium' | 'high';
};

// One button per session group — label shown to user
const SESSION_CONFIG: Record<string, { label: string }> = {
  morning: { label: '09:00 – 11:30' },
  afternoon1: { label: '12:00 – 14:30' },
  afternoon2: { label: '15:00 – 17:30' },
  evening: { label: '18:00 – 20:30' },
};

const SESSION_LABEL_ID: Record<string, string> = {
  morning: 'Sesi Pagi',
  afternoon1: 'Sesi Siang',
  afternoon2: 'Sesi Sore',
  evening: 'Sesi Malam',
};

export function JourneyTimeSlotsSection({
  copy,
  selectedDate,
  hasBookableDates,
  isAllDayTicket,
  selectedTime,
  availableSlotsCount,
  groupedSlots,
  onSelectTime,
  getMinutesUntilClose,
  getSlotUrgency,
}: JourneyTimeSlotsSectionProps) {
  if (!selectedDate && hasBookableDates) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-4 md:p-8 border border-gray-200">
      <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">
        {isAllDayTicket ? copy.access_type_title : copy.time_slots_title}
      </h3>

      {!hasBookableDates ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-xs md:text-sm text-amber-900">
          Booking is not available right now. New dates have not been published yet.
        </p>
      ) : null}

      {hasBookableDates && isAllDayTicket ? (
        <div className="mb-4 md:mb-6">
          <button
            onClick={() => onSelectTime(null)}
            className={`w-full rounded-lg border px-4 md:px-6 py-3 md:py-4 text-left transition-colors ${selectedTime === null
              ? 'border-main-600 bg-main-50 text-main-700'
              : 'border-gray-300 bg-white text-gray-800'
              }`}
          >
            <div className="font-bold text-sm md:text-base">{copy.all_day_access_label}</div>
            <div className="text-xs opacity-70">{copy.all_day_access_helper}</div>
          </button>
        </div>
      ) : null}

      {hasBookableDates && availableSlotsCount > 0 ? (
        <div className="space-y-3 md:space-y-4">
          {isAllDayTicket ? (
            <p className="text-xs md:text-sm font-black uppercase tracking-widest text-main-600/70">
              {copy.choose_specific_time_label}
            </p>
          ) : null}

          {(
            Object.entries(groupedSlots) as Array<
              [keyof GroupedTimeSlots, GroupedTimeSlots[keyof GroupedTimeSlots]]
            >
          ).map(([period, slots]) => {
            if (slots.length === 0) return null;

            const cfg = SESSION_CONFIG[period as string];
            const sessionLabel = cfg?.label ?? (period as string);
            const periodLabel = SESSION_LABEL_ID[period as string] ?? (period as string);

            // Use the first non-past slot as representative; fall back to first slot
            const firstAvailable = slots.find((s) => !s.isPast) ?? slots[0];
            const representativeTime = firstAvailable.time;

            // Session is selected when selectedTime belongs to any slot in this group
            const isSelected = slots.some((s) => s.time === selectedTime);
            const isPast = slots.every((s) => s.isPast);

            // Show the most conservative (minimum) capacity
            const minAvailable = Math.min(...slots.map((s) => s.available));

            const _urgency = isPast ? 'none' : getSlotUrgency(representativeTime);
            const _minutesLeft = isPast ? null : getMinutesUntilClose(representativeTime);
            void _urgency; void _minutesLeft;

            return (
              <button
                key={period as string}
                onClick={() => !isPast && onSelectTime(representativeTime)}
                disabled={isPast}
                className={`w-full rounded-xl border px-5 py-4 text-left transition-all ${isPast
                  ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200'
                  : isSelected
                    ? 'border-main-600 bg-main-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-main-400 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                      {periodLabel}
                    </p>
                    <p
                      className={`text-lg md:text-xl font-black ${isSelected ? 'text-main-700' : 'text-gray-800'
                        } ${isPast ? 'line-through' : ''}`}
                    >
                      {sessionLabel}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    {isPast ? (
                      <span className="text-xs text-gray-400 font-medium">Berakhir</span>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border shadow-md
                          ${minAvailable <= 10
                            ? 'bg-pink-500 text-white border-pink-400 animate-pulse'
                            : 'bg-pink-100 text-pink-700 border-pink-200'
                          }`}
                      >
                        🎟 {minAvailable} slot tersisa
                      </span>
                    )}

                    {/* {!isPast && minutesLeft !== null && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          urgency === 'high'
                            ? 'bg-red-500 text-white animate-pulse'
                            : urgency === 'medium'
                              ? 'bg-orange-500 text-white'
                              : urgency === 'low'
                                ? 'bg-yellow-400 text-black'
                                : ''
                        }`}
                      >
                        {Math.floor(minutesLeft / 60)}:
                        {(minutesLeft % 60).toString().padStart(2, '0')} lagi
                      </span>
                    )} */}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : hasBookableDates && !isAllDayTicket ? (
        <p className="text-gray-500 text-center py-6 md:py-8 text-xs md:text-sm">
          {copy.empty_slots_message}
        </p>
      ) : null}
    </div>
  );
}
