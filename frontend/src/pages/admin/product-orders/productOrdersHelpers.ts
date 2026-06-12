import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import type { AdminMenuSection } from '../../../components/AdminLayout';
import { formatDateTimeWIB, toLocalDateString, nowWIB } from '../../../utils/timezone';
import type { ProductOrdersTab } from './productOrdersTypes';

const EMPTY_STATE_COPY: Record<ProductOrdersTab, { icon: string; message: string }> = {
  pending_payment: { icon: 'hourglass_empty', message: 'Belum ada pesanan menunggu pembayaran.' },
  pending_pickup: { icon: 'inventory_2', message: 'Tidak ada pesanan menunggu pickup.' },
  today: { icon: 'today', message: 'Belum ada pesanan paid hari ini.' },
  completed: { icon: 'check_circle', message: 'Belum ada pesanan selesai.' },
  shipping: { icon: 'local_shipping', message: 'Tidak ada pesanan yang perlu dikirim.' },
};

export function getPendingOrders(orders: OrderSummaryRow[]) {
  return orders
    .filter((order) => order.payment_status === 'paid')
    .filter((order) => order.pickup_status === 'pending_pickup' || order.pickup_status === 'pending_review')
    .sort((left, right) => {
      const leftTime = left.paid_at || left.created_at || '';
      const rightTime = right.paid_at || right.created_at || '';
      return rightTime.localeCompare(leftTime);
    });
}

export function getPendingPaymentOrders(orders: OrderSummaryRow[]) {
  return orders
    .filter((order) => order.channel === 'cashier')
    .filter((order) => order.status === 'awaiting_payment')
    .filter((order) => order.payment_status === 'unpaid' || order.payment_status === 'pending')
    .filter((order) => order.pickup_status === 'pending_pickup' || order.pickup_status === 'pending_review')
    .sort((left, right) => {
      const leftTime = left.created_at || left.paid_at || '';
      const rightTime = right.created_at || right.paid_at || '';
      return rightTime.localeCompare(leftTime);
    });
}

export function getTodaysOrders(orders: OrderSummaryRow[]) {
  const todayKey = toLocalDateString(nowWIB());
  return orders
    .filter((order) => order.payment_status === 'paid')
    .filter((order) => {
      const dateStr = order.paid_at || order.created_at;
      return dateStr ? String(dateStr).slice(0, 10) === todayKey : false;
    })
    .sort((left, right) => {
      const leftTime = left.paid_at || left.created_at || '';
      const rightTime = right.paid_at || right.created_at || '';
      return rightTime.localeCompare(leftTime);
    });
}

export function getCompletedOrders(orders: OrderSummaryRow[]) {
  return orders
    .filter((order) => order.payment_status === 'paid')
    .filter((order) => order.pickup_status === 'completed')
    .sort((left, right) => (right.updated_at ?? '').localeCompare(left.updated_at ?? ''));
}

export function getShippingOrders(orders: OrderSummaryRow[]) {
  return orders
    .filter((order) => order.payment_status === 'paid')
    .filter((order) => order.pickup_status === 'pending_shipment' || order.pickup_status === 'shipped')
    .sort((left, right) => {
      const leftTime = left.paid_at || left.created_at || '';
      const rightTime = right.paid_at || right.created_at || '';
      return rightTime.localeCompare(leftTime);
    });
}

export function getDisplayOrders(
  tab: ProductOrdersTab,
  pendingOrders: OrderSummaryRow[],
  pendingPaymentOrders: OrderSummaryRow[],
  todaysOrders: OrderSummaryRow[],
  completedOrders: OrderSummaryRow[],
  shippingOrders: OrderSummaryRow[]
) {
  if (tab === 'pending_payment') return pendingPaymentOrders;
  if (tab === 'pending_pickup') return pendingOrders;
  if (tab === 'today') return todaysOrders;
  if (tab === 'shipping') return shippingOrders;
  return completedOrders;
}

export function getPickupStatusClass(pickupStatus: string | null) {
  if (pickupStatus === 'pending_pickup') return 'bg-yellow-100 text-yellow-700';
  if (pickupStatus === 'pending_review') return 'bg-orange-100 text-orange-700';
  if (pickupStatus === 'completed') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-700';
}

export function getPickupStatusLabel(pickupStatus: string | null) {
  if (pickupStatus === 'pending_pickup') return 'Pending';
  if (pickupStatus === 'pending_review') return 'Review';
  if (pickupStatus === 'completed') return 'Selesai';
  return pickupStatus ?? 'pending';
}

export function getOrderTimingLabel(order: OrderSummaryRow) {
  if (order.pickup_status === 'completed' && order.updated_at) {
    return {
      prefix: 'Terselesaikan:',
      value: formatDateTimeWIB(order.updated_at),
    };
  }

  const dateValue = order.paid_at || order.created_at;
  if (!dateValue) return null;

  return {
    prefix: order.paid_at ? 'Dibayar:' : 'Order:',
    value: formatDateTimeWIB(dateValue),
  };
}

export function getEmptyStateCopy(tab: ProductOrdersTab) {
  return EMPTY_STATE_COPY[tab];
}

export function buildProductOrdersMenuSections(pendingCount: number, baseSections: AdminMenuSection[]) {
  return baseSections.map((section) => {
    if (section.id !== 'store') return section;
    return {
      ...section,
      items: section.items.map((item) => {
        if (item.id !== 'product-orders') return item;
        return { ...item, badge: pendingCount };
      }),
    };
  });
}
