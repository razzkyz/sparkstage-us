import { formatCurrency } from '../../utils/formatters';
import { calcMaxRedeemablePoints, getLoyaltyRankByTier } from '../../hooks/useLoyaltyPoints';

export type AppliedPoints = {
  pointsUsed: number;
  discountAmount: number;
};

type CheckoutPointsSectionProps = {
  userPoints: number;
  userTierLevel: number;
  subtotal: number;
  appliedPoints: AppliedPoints | null;
  loading: boolean;
  onApplyPoints: (points: number) => void;
  onRemovePoints: () => void;
};

export function CheckoutPointsSection({
  userPoints,
  userTierLevel,
  subtotal,
  appliedPoints,
  loading,
  onApplyPoints,
  onRemovePoints,
}: CheckoutPointsSectionProps) {
  const maxRedeemable = calcMaxRedeemablePoints(userPoints, subtotal);
  const rank = getLoyaltyRankByTier(userTierLevel);
  const hasEnoughPoints = userPoints > 0 && maxRedeemable > 0;

  if (userPoints === 0) return null;

  return (
    <div
      className="mb-6 rounded-xl p-4 overflow-hidden relative border border-gray-200"
      style={{ background: '#ffffff' }}
    >
      {/* Subtle glow */}
      <div
        className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5 blur-2xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #ff4b86, transparent)' }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{rank.icon}</span>
            <div>
              <p className="text-xs font-bold" style={{ color: '#000' }}>SPARK CLUB Points</p>
              <p className="text-[10px]" style={{ color: '#666' }}>
                {userPoints.toLocaleString()} poin tersedia
                {appliedPoints && (
                  <span style={{ color: '#22c55e' }}> · Dipakai: {appliedPoints.pointsUsed.toLocaleString()}</span>
                )}
              </p>
            </div>
          </div>

          {appliedPoints && (
            <button
              type="button"
              onClick={onRemovePoints}
              disabled={loading}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'rgba(255,75,134,0.2)', color: '#ff4b86' }}
            >
              Batalkan
            </button>
          )}
        </div>

        {/* Applied state */}
        {appliedPoints ? (
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">✅</span>
              <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                {appliedPoints.pointsUsed.toLocaleString()} poin digunakan
              </p>
            </div>
            <span className="text-sm font-black" style={{ color: '#22c55e' }}>
              -{formatCurrency(appliedPoints.discountAmount)}
            </span>
          </div>
        ) : hasEnoughPoints ? (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: '#666' }}>
              Maksimal bisa pakai <span className="font-bold" style={{ color: '#000' }}>{maxRedeemable.toLocaleString()} poin</span> = diskon <span className="font-bold" style={{ color: '#ff4b86' }}>{formatCurrency(maxRedeemable)}</span>
              <span style={{ color: '#999' }}> (maks. 50% dari subtotal)</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onApplyPoints(maxRedeemable)}
                disabled={loading}
                className="flex-1 py-2 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #ff4b86, #e63d75)', color: 'white' }}
              >
                Pakai {maxRedeemable.toLocaleString()} Poin (Maks)
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: '#999' }}>
            Poin kamu ({userPoints.toLocaleString()}) tidak cukup untuk diskon pada order ini.
          </p>
        )}
      </div>
    </div>
  );
}
