import { describe, expect, it } from 'vitest';
import {
  classifyProductOrder,
  isActivePickup,
  isHistoryOrder,
  isPickupReady,
  isPendingPayment,
  shouldAutoSyncProductOrder,
  shouldRedirectPendingToSuccess,
  shouldRedirectSuccessToPending,
} from './status';

describe('product order status helpers', () => {
  it('classifies pending unpaid orders', () => {
    const order = {
      payment_status: 'pending',
      status: 'pending',
      pickup_status: null,
      channel: 'online',
    };

    expect(isPendingPayment(order)).toBe(true);
    expect(classifyProductOrder(order)).toBe('pending');
    expect(shouldAutoSyncProductOrder(order)).toBe(true);
  });

  it('classifies paid pickup orders as active', () => {
    const order = {
      payment_status: 'paid',
      status: 'processing',
      pickup_status: 'pending_pickup',
      channel: 'online',
    };

    expect(isActivePickup(order)).toBe(true);
    expect(classifyProductOrder(order)).toBe('active');
  });

  it('classifies terminal orders as history', () => {
    const order = {
      payment_status: 'failed',
      status: 'expired',
      pickup_status: 'expired',
      channel: 'online',
    };

    expect(isHistoryOrder(order)).toBe(true);
    expect(classifyProductOrder(order)).toBe('history');
    expect(shouldAutoSyncProductOrder(order)).toBe(false);
  });

  it('handles pending/success redirects consistently', () => {
    expect(
      shouldRedirectPendingToSuccess({
        payment_status: 'paid',
      })
    ).toBe(true);

    expect(
      shouldRedirectSuccessToPending({
        payment_status: 'pending',
        channel: 'online',
      })
    ).toBe(true);

    expect(
      shouldRedirectSuccessToPending({
        payment_status: 'pending',
        channel: 'cashier',
      })
    ).toBe(false);

    expect(
      shouldAutoSyncProductOrder({
        payment_status: 'unpaid',
        status: 'awaiting_payment',
        channel: 'cashier',
      })
    ).toBe(false);
  });

  it('only treats pickup as ready for paid online orders or cashier orders', () => {
    expect(
      isPickupReady({
        pickup_code: 'PU-123',
        payment_status: 'pending',
        channel: 'online',
      })
    ).toBe(false);

    expect(
      isPickupReady({
        pickup_code: 'PU-123',
        payment_status: 'paid',
        channel: 'online',
      })
    ).toBe(true);

    expect(
      isPickupReady({
        pickup_code: 'CS-123',
        payment_status: 'unpaid',
        channel: 'cashier',
      })
    ).toBe(true);
  });
});
