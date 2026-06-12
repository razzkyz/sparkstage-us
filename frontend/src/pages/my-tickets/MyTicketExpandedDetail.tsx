import type { TFunction } from 'i18next';
import type { TicketOrderListItem } from '../../hooks/useMyTicketOrders';
import { getSessionRange } from '../booking-success/bookingSuccessFormatters';

type MyTicketExpandedDetailProps = {
  order: TicketOrderListItem;
  t: TFunction;
};

export function MyTicketExpandedDetail({ order, t }: MyTicketExpandedDetailProps) {
  return (
    <div className="bg-gray-50 border-t border-gray-200 p-6">
      <h4 className="text-sm font-bold text-gray-900 mb-4">{t('myTickets.actions.viewItems', 'Items')}</h4>
      <div className="space-y-4">
        {order.order_items.map((item) => {
          const hasPurchasedTickets = item.purchased_tickets && item.purchased_tickets.length > 0;
          
          return (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h5 className="font-bold text-gray-900">{item.ticket_name}</h5>
                  <div className="text-sm text-gray-500 mt-1 space-y-1">
                    <p>Date: {item.selected_date}</p>
                    {item.selected_time_slots && (
                      <p>Time: {(() => {
                        const slots = Array.isArray(item.selected_time_slots) ? item.selected_time_slots : [item.selected_time_slots];
                        return slots.map(slot => getSessionRange(slot) || slot).join(', ');
                      })()}</p>
                    )}
                    <p>Qty: {item.quantity}</p>
                  </div>
                </div>
              </div>

              {hasPurchasedTickets && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h6 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Issued Tickets</h6>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {item.purchased_tickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-rose-600">qr_code_2</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono font-bold text-gray-900 truncate">
                            {ticket.ticket_code}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              ticket.status === 'active' ? 'bg-green-100 text-green-700' :
                              ticket.status === 'used' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {ticket.status}
                            </span>
                            {ticket.queue_number != null && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                Q: {ticket.queue_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
