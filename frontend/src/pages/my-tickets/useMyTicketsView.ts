import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useMyTicketOrders } from '../../hooks/useMyTicketOrders';
import type { TicketOrderListItem } from '../../hooks/useMyTicketOrders';
import { syncTicketOrderStatus } from './syncTicketOrderStatus';

type UseMyTicketsViewParams = {
  userId: string | null | undefined;
  sessionToken: string | null | undefined;
  getValidAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  t: TFunction;
};

export function classifyTicketOrder(order: TicketOrderListItem) {
  const status = String(order.status || '').toLowerCase();
  if (status === 'pending') return 'pending';
  if (status === 'paid') return 'active';
  return 'history';
}

export function shouldAutoSyncTicketOrder(order: TicketOrderListItem) {
  const status = String(order.status || '').toLowerCase();
  if (status !== 'pending') return false;
  
  if (!order.created_at) return false;
  const ageMs = Date.now() - new Date(order.created_at).getTime();
  return ageMs < 24 * 60 * 60 * 1000;
}

export function useMyTicketsView({
  userId,
  sessionToken,
  getValidAccessToken,
  refreshSession,
  showToast,
  t,
}: UseMyTicketsViewParams) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [syncingOrderId, setSyncingOrderId] = useState<number | null>(null);
  const attemptedAutoSync = useRef(new Set<string>());
  const autoSelectedTab = useRef(false);
  const { data: orders = [], error, isLoading: loading, isFetching } = useMyTicketOrders(userId);

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load tickets');
    }
  }, [error, showToast]);

  const { pendingOrders, activeOrders, historyOrders } = useMemo(() => {
    const pending: TicketOrderListItem[] = [];
    const active: TicketOrderListItem[] = [];
    const history: TicketOrderListItem[] = [];
    for (const order of orders) {
      const category = classifyTicketOrder(order);
      if (category === 'pending') pending.push(order);
      else if (category === 'active') active.push(order);
      else history.push(order);
    }
    return { pendingOrders: pending, activeOrders: active, historyOrders: history };
  }, [orders]);

  useEffect(() => {
    if (autoSelectedTab.current || loading || orders.length === 0) return;

    if (pendingOrders.length > 0) {
      setActiveTab('pending');
    } else if (activeOrders.length > 0) {
      setActiveTab('active');
    } else if (historyOrders.length > 0) {
      setActiveTab('history');
    }

    autoSelectedTab.current = true;
  }, [activeOrders.length, historyOrders.length, loading, orders.length, pendingOrders.length]);

  const displayOrders = useMemo(() => {
    if (activeTab === 'pending') return pendingOrders;
    if (activeTab === 'active') return activeOrders;
    return historyOrders;
  }, [activeOrders, activeTab, historyOrders, pendingOrders]);

  const { mutate: autoSyncTicketStatus } = useMutation({
    mutationFn: async ({ orderNumber }: { orderNumber: string }) => {
      const token = (await getValidAccessToken()) ?? sessionToken ?? null;
      if (!token) return;

      await syncTicketOrderStatus(orderNumber, token, {
        retryWithFreshToken: async () => {
          await refreshSession();
          return getValidAccessToken();
        },
      });
    },
    retry: 0,
  });

  useEffect(() => {
    if (!userId) return;

    const pending = pendingOrders.filter((order) => shouldAutoSyncTicketOrder(order));
    const timeoutIds: number[] = [];

    pending.forEach((order) => {
      const key = order.order_number;
      if (attemptedAutoSync.current.has(key)) return;

      attemptedAutoSync.current.add(key);
      [0, 20000].forEach((delayMs) => {
        timeoutIds.push(
          window.setTimeout(() => {
            autoSyncTicketStatus({ orderNumber: order.order_number });
          }, delayMs)
        );
      });
    });

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [autoSyncTicketStatus, pendingOrders, userId]);

  const handleSyncStatus = useCallback(
    async (order: TicketOrderListItem) => {
      if (!sessionToken) {
        showToast('error', t('myTickets.errors.notAuthenticated'));
        return;
      }

      setSyncingOrderId(order.id);
      try {
        await syncTicketOrderStatus(order.order_number, sessionToken, {
          retryWithFreshToken: async () => {
            await refreshSession();
            return getValidAccessToken();
          },
        });
        showToast('success', t('myTickets.toast.syncSuccess'));
      } catch (syncError) {
        showToast(
          'error',
          syncError instanceof Error && syncError.message ? syncError.message : t('myTickets.errors.syncFailed')
        );
      } finally {
        setSyncingOrderId(null);
      }
    },
    [getValidAccessToken, refreshSession, sessionToken, showToast, t]
  );

  const toggleExpand = useCallback((orderId: number) => {
    setExpandedOrder((current) => (current === orderId ? null : orderId));
  }, []);

  const getStatusBadge = useCallback(
    (order: TicketOrderListItem) => {
      const status = String(order.status || '').toLowerCase();
      if (status === 'paid') {
        return { label: t('myTickets.status.paid'), tone: 'green' as const };
      }
      if (status === 'expired') {
        return { label: t('myTickets.status.expired'), tone: 'gray' as const };
      }
      if (status === 'cancelled') {
        return { label: t('myTickets.status.cancelled'), tone: 'red' as const };
      }
      if (status === 'failed') {
        return { label: t('myTickets.status.failed'), tone: 'red' as const };
      }
      return { label: t('myTickets.status.pendingPayment'), tone: 'yellow' as const };
    },
    [t]
  );

  return {
    orders,
    loading,
    isFetching,
    activeTab,
    expandedOrder,
    syncingOrderId,
    pendingOrders,
    activeOrders,
    historyOrders,
    displayOrders,
    setActiveTab,
    toggleExpand,
    handleSyncStatus,
    getStatusBadge,
  };
}
