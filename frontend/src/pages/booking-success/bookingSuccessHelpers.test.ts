import { describe, expect, it } from 'vitest';
import {
  AUTO_SYNC_RECOVERY_DELAY_MS,
  MANUAL_STATUS_CHECK_DELAY_MS,
  MAX_SKELETON_MS,
  shouldAutoSyncBookingStatus,
  shouldTriggerBookingConfetti,
} from './bookingSuccessHelpers';

describe('bookingSuccessHelpers', () => {
  it('keeps the expected skeleton timeout constant', () => {
    expect(MAX_SKELETON_MS).toBe(20000);
  });

  it('keeps deliberate status recovery delay constants', () => {
    expect(AUTO_SYNC_RECOVERY_DELAY_MS).toBe(15000);
    expect(MANUAL_STATUS_CHECK_DELAY_MS).toBe(8000);
  });

  it('decides auto sync only for pending or paid states without tickets', () => {
    expect(
      shouldAutoSyncBookingStatus({
        orderNumber: 'ORD-1',
        effectiveStatus: 'pending',
        initialIsPending: false,
        ticketsCount: 0,
        autoSyncAttempted: false,
      })
    ).toBe(true);

    expect(
      shouldAutoSyncBookingStatus({
        orderNumber: 'ORD-1',
        effectiveStatus: 'paid',
        initialIsPending: false,
        ticketsCount: 1,
        autoSyncAttempted: false,
      })
    ).toBe(false);
  });

  it('does not auto sync again after the recovery check already ran for the order', () => {
    expect(
      shouldAutoSyncBookingStatus({
        orderNumber: 'ORD-1',
        effectiveStatus: 'pending',
        initialIsPending: false,
        ticketsCount: 0,
        autoSyncAttempted: true,
      })
    ).toBe(false);
  });

  it('keeps syncing when the order started pending but delayed confirmation has not arrived yet', () => {
    expect(
      shouldAutoSyncBookingStatus({
        orderNumber: 'ORD-2',
        effectiveStatus: null,
        initialIsPending: true,
        ticketsCount: 0,
        autoSyncAttempted: false,
      })
    ).toBe(true);

    expect(
      shouldAutoSyncBookingStatus({
        orderNumber: 'ORD-2',
        effectiveStatus: 'failed',
        initialIsPending: true,
        ticketsCount: 0,
        autoSyncAttempted: false,
      })
    ).toBe(false);

    expect(
      shouldAutoSyncBookingStatus({
        orderNumber: '',
        effectiveStatus: 'pending',
        initialIsPending: true,
        ticketsCount: 0,
        autoSyncAttempted: false,
      })
    ).toBe(false);
  });

  it('only triggers confetti when tickets are available and loading is done', () => {
    expect(
      shouldTriggerBookingConfetti({
        ticketsCount: 2,
        effectiveStatus: 'paid',
        loading: false,
      })
    ).toBe(true);

    expect(
      shouldTriggerBookingConfetti({
        ticketsCount: 0,
        effectiveStatus: 'paid',
        loading: false,
      })
    ).toBe(false);
  });
});
