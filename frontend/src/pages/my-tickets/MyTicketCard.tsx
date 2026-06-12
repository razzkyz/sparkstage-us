import type { TFunction } from 'i18next';
import { formatCurrency } from '../../utils/formatters';
import { formatDateTimeWIB } from '../../utils/timezone';
import type { TicketOrderListItem } from '../../hooks/useMyTicketOrders';
import { getSessionRange } from '../booking-success/bookingSuccessFormatters';
import { MyTicketExpandedDetail } from './MyTicketExpandedDetail';

type MyTicketCardProps = {
  order: TicketOrderListItem;
  isExpanded: boolean;
  isSyncing: boolean;
  onToggleExpand: () => void;
  onPayNow: () => void;
  onHide: () => void;
  onSyncStatus: () => void;
  onViewDetails: () => void;
  statusBadge: { label: string; tone: 'yellow' | 'green' | 'gray' | 'red' };
  t: TFunction;
};

export function MyTicketCard({
  order,
  isExpanded,
  isSyncing,
  onToggleExpand,
  onPayNow,
  onHide,
  onSyncStatus,
  onViewDetails,
  statusBadge,
  t,
}: MyTicketCardProps) {
  const isPaid = String(order.status || '').toLowerCase() === 'paid';
  const isPending = String(order.status || '').toLowerCase() === 'pending';
  
  const toneMap = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  };

  const firstItem = order.order_items?.[0];

  return (
    <div className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-300 transition-all overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-rose-600">Booking</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="text-xs font-medium text-gray-500 font-mono tracking-wide">#{order.order_number}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${toneMap[statusBadge.tone]}`}>
                {statusBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="material-symbols-outlined text-base">schedule</span>
              <span>{order.created_at ? formatDateTimeWIB(order.created_at) : '-'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-xl font-serif font-bold text-gray-900">{formatCurrency(order.total)}</p>
              <p className="text-xs text-gray-500">{order.itemCount} tickets</p>
            </div>
          </div>
        </div>

        {firstItem && (
          <div className="mb-4 bg-rose-50 border border-rose-100 rounded-lg p-3">
            <h4 className="font-bold text-gray-900 mb-1">{firstItem.ticket_name}</h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                <span>{firstItem.selected_date}</span>
              </div>
              {firstItem.selected_time_slots && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>
                    {(() => {
                      const slots = Array.isArray(firstItem.selected_time_slots) ? firstItem.selected_time_slots : [firstItem.selected_time_slots];
                      return slots.map(slot => getSessionRange(slot) || slot).join(', ');
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onToggleExpand}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">{isExpanded ? 'expand_less' : 'expand_more'}</span>
            {isExpanded ? t('myTickets.actions.hideItems', 'Hide Items') : t('myTickets.actions.viewItems', 'View Items')}
          </button>

          {isPending && (
            <>
              <button
                onClick={onPayNow}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                {t('myTickets.actions.payNow', 'Pay Now')}
              </button>
              <button
                onClick={onSyncStatus}
                disabled={isSyncing}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">{isSyncing ? 'progress_activity' : 'refresh'}</span>
                {isSyncing ? t('myTickets.actions.refreshing', 'Refreshing...') : t('myTickets.actions.refreshStatus', 'Refresh Status')}
              </button>
            </>
          )}

          {isPaid && (
            <button
              onClick={onViewDetails}
              className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
              {t('myTickets.viewQR', 'View QR')}
            </button>
          )}

          <button
            onClick={onHide}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            Hapus Tiket
          </button>
        </div>
      </div>

      {isExpanded && <MyTicketExpandedDetail order={order} t={t} />}
    </div>
  );
}
