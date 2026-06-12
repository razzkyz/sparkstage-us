type AutoSyncParams = {
  orderNumber: string;
  effectiveStatus: string | null;
  initialIsPending: boolean;
  ticketsCount: number;
  autoSyncAttempted: boolean;
};

type ConfettiParams = {
  ticketsCount: number;
  effectiveStatus: string | null;
  loading: boolean;
};

export const MAX_SKELETON_MS = 10000;
export const AUTO_SYNC_RECOVERY_DELAY_MS = 15000;
export const MANUAL_STATUS_CHECK_DELAY_MS = 8000;

export function shouldAutoSyncBookingStatus({
  orderNumber,
  effectiveStatus,
  initialIsPending,
  ticketsCount,
  autoSyncAttempted,
}: AutoSyncParams) {
  return Boolean(
    orderNumber &&
      !autoSyncAttempted &&
      (effectiveStatus === 'pending' || effectiveStatus === 'paid' || (effectiveStatus === null && initialIsPending)) &&
      ticketsCount === 0
  );
}

export function shouldTriggerBookingConfetti({ ticketsCount, effectiveStatus, loading }: ConfettiParams) {
  return ticketsCount > 0 && effectiveStatus === 'paid' && !loading;
}
