import type { BookingPageSettings } from '../../hooks/useBookingPageSettings';
import { formatCurrency } from '../../utils/formatters';
import type { TicketData } from '../../types';
import { m } from 'framer-motion';

type JourneySummaryCardProps = {
  copy: Pick<
    BookingPageSettings,
    | 'booking_summary_title'
    | 'ticket_type_label'
    | 'date_label'
    | 'time_label'
    | 'not_selected_label'
    | 'all_day_access_value_label'
    | 'ticket_price_label'
    | 'vat_included_label'
    | 'total_label'
    | 'proceed_button_label'
    | 'secure_checkout_label'
    | 'important_info_title'
    | 'important_info_items'
  >;
  ticket: TicketData;
  selectedDate: Date | null;
  selectedTime: string | null;
  isAllDayTicket: boolean;
  onProceed: () => void;
};

export function JourneySummaryCard({
  copy,
  ticket,
  selectedDate,
  selectedTime,
  isAllDayTicket,
  onProceed,
}: JourneySummaryCardProps) {
  const price = Number.parseFloat(ticket.price);
  const total = price;

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 md:p-8 lg:sticky lg:top-28">
      <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8 italic">{copy.booking_summary_title}</h3>

      <div className="space-y-5 md:space-y-6 mb-6 md:mb-8">
        <div className="flex items-start gap-3 md:gap-4">
          <span className="material-symbols-outlined text-main-600 text-xl md:text-2xl">confirmation_number</span>
          <div className="flex-1">
            <p className="text-xs md:text-sm font-bold uppercase tracking-tighter opacity-60">{copy.ticket_type_label}</p>
            <p className="font-medium text-sm md:text-base">{ticket.name}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 md:gap-4">
          <span className="material-symbols-outlined text-main-600 text-xl md:text-2xl">event</span>
          <div className="flex-1">
            <p className="text-xs md:text-sm font-bold uppercase tracking-tighter opacity-60">{copy.date_label}</p>
            <p className="font-medium text-sm md:text-base">
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : copy.not_selected_label}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 md:gap-4">
          <span className="material-symbols-outlined text-main-600 text-xl md:text-2xl">schedule</span>
          <div className="flex-1">
            <p className="text-xs md:text-sm font-bold uppercase tracking-tighter opacity-60">{copy.time_label}</p>
            <p className="font-medium text-sm md:text-base">
              {selectedTime ? selectedTime.substring(0, 5) : isAllDayTicket ? copy.all_day_access_value_label : copy.not_selected_label}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 md:pt-6 mb-4 md:mb-6 space-y-2 md:space-y-3">
        <div className="flex justify-between text-sm md:text-sm">
          <span className="text-gray-600 text-xs md:text-sm">
            {copy.ticket_price_label} <span className="text-xs text-gray-500">{copy.vat_included_label}</span>
          </span>
          <span className="font-medium text-sm md:text-base">{formatCurrency(price)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-gray-200">
          <span className="text-base md:text-lg font-bold">{copy.total_label}</span>
          <span className="text-xl md:text-2xl font-black text-main-600">{formatCurrency(total)}</span>
        </div>
      </div>

      <button
        onClick={onProceed}
        disabled={!selectedDate || (!selectedTime && !isAllDayTicket)}
        className="w-full bg-[#ff4b86] hover:bg-[#e63d75] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 md:py-4 rounded-lg transition-all shadow-lg text-sm md:text-base"
      >
        {copy.proceed_button_label}
      </button>

      <p className="text-center text-xs md:text-xs text-gray-500 mt-3 md:mt-4">{copy.secure_checkout_label}</p>

      <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
        <m.p 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-xs md:text-sm font-bold uppercase tracking-wider text-red-600 text-center mb-2 md:mb-3"
        >
          {copy.important_info_title}
        </m.p>
        <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600">
          {copy.important_info_items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className={`flex items-start gap-2 ${index === copy.important_info_items.length - 1 ? 'text-red-600 font-medium' : ''}`}
            >
              <span className="shrink-0 mt-[1px]">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
