import { ensureFreshToken } from '../../../utils/auth';
import { getSupabaseFunctionStatus } from '../../../lib/supabaseFunctionError';
import { invokeSupabaseFunction } from '../../../lib/supabaseFunctionInvoke';

export type ProductPickupSuccess = {
  status: string;
  orderId: number | null;
  pickupCode: string;
  pickupStatus: string;
};

export async function completeProductPickup(params: {
  pickupCode: string;
  session: Parameters<typeof ensureFreshToken>[0];
}): Promise<ProductPickupSuccess> {
  const token = await ensureFreshToken(params.session);
  if (!token) {
    throw new Error('Sesi login tidak valid. Silakan login ulang.');
  }

  const normalizedPickupCode = params.pickupCode.trim().toUpperCase();
  try {
    const data = await invokeSupabaseFunction<ProductPickupSuccess>({
      functionName: 'complete-product-pickup',
      body: { pickupCode: normalizedPickupCode },
      headers: { Authorization: `Bearer ${token}` },
      fallbackMessage: 'Gagal menyelesaikan pickup produk',
    });

    if (!data) {
      throw new Error('Data pickup produk tidak lengkap');
    }

    return data;
  } catch (error) {
    if (getSupabaseFunctionStatus(error) === 401) {
      throw new Error('Sesi login kadaluarsa. Silakan login ulang.');
    }
    throw error;
  }
}
