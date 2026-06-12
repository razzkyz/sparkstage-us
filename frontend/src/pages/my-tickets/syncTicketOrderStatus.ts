import { getValidatedAccessToken, readCurrentAccessToken } from '../../auth/sessionAccess';
import { getSupabaseFunctionStatus } from '../../lib/supabaseFunctionError';
import { invokeSupabaseFunction } from '../../lib/supabaseFunctionInvoke';
import { withTimeout } from '../../utils/queryHelpers';

type SessionLike = { access_token?: string | null; expires_at?: number | null } | null;

type SyncTicketOrderStatusOptions = {
  retryWithFreshToken?: () => Promise<string | null>;
};

export type SyncTicketOrderStatusResponse = {
  order?: unknown | null;
};

export async function readCurrentTicketOrderAccessToken() {
  return readCurrentAccessToken(8000, 'Session fetch timeout. Please try again.');
}

export async function getTicketOrderAccessToken(params: {
  session: SessionLike;
  validateSession: () => Promise<boolean>;
}) {
  return getValidatedAccessToken({
    session: params.session,
    validateSession: params.validateSession,
    timeoutMs: 8000,
    timeoutMessage: 'Session fetch timeout. Please try again.',
  });
}

async function requestTicketOrderSync(
  orderNumber: string,
  accessToken: string
): Promise<SyncTicketOrderStatusResponse> {
  return withTimeout(
    invokeSupabaseFunction<SyncTicketOrderStatusResponse>({
      functionName: 'sync-doku-ticket-status',
      body: { order_number: orderNumber },
      headers: { Authorization: `Bearer ${accessToken}` },
      fallbackMessage: 'Failed to sync status',
    }),
    15000,
    'Request timeout. Please try again.'
  );
}

export async function syncTicketOrderStatus(
  orderNumber: string,
  accessToken: string,
  options: SyncTicketOrderStatusOptions = {}
): Promise<SyncTicketOrderStatusResponse> {
  try {
    return await requestTicketOrderSync(orderNumber, accessToken);
  } catch (error) {
    if (getSupabaseFunctionStatus(error) === 401 && typeof options.retryWithFreshToken === 'function') {
      const freshToken = await options.retryWithFreshToken();
      if (freshToken) {
        return requestTicketOrderSync(orderNumber, freshToken);
      }
    }

    throw error;
  }
}
