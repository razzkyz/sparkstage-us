import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type LoyaltyPointsBalance = {
  total_points: number;
  tier_level: number;
  updated_at: string;
};

export type LoyaltyPointsHistoryItem = {
  id: number;
  points_change: number;
  reason: string;
  order_id: number | null;
  created_at: string;
};

// ─── Rank System ─────────────────────────────────────────────────────────────

export type LoyaltyRank = {
  name: string;
  label: string;         // Indonesian label
  minPoints: number;
  maxPoints: number | null;
  color: string;         // CSS color for text
  bgColor: string;       // CSS background color
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;          // emoji
  nextRankPoints: number | null;
};

export const LOYALTY_RANKS: LoyaltyRank[] = [
  {
    name: 'Stargazer',
    label: 'Stargazer',
    minPoints: 0,
    maxPoints: 199,
    color: '#9ca3af',
    bgColor: 'rgba(156,163,175,0.15)',
    borderColor: 'rgba(156,163,175,0.4)',
    gradientFrom: '#6b7280',
    gradientTo: '#9ca3af',
    icon: '⭐',
    nextRankPoints: 200,
  },
  {
    name: 'Moonwalker',
    label: 'Moonwalker',
    minPoints: 200,
    maxPoints: 499,
    color: '#60a5fa',
    bgColor: 'rgba(96,165,250,0.15)',
    borderColor: 'rgba(96,165,250,0.4)',
    gradientFrom: '#3b82f6',
    gradientTo: '#60a5fa',
    icon: '🌙',
    nextRankPoints: 500,
  },
  {
    name: 'Galaxian',
    label: 'Galaxian',
    minPoints: 500,
    maxPoints: 1499,
    color: '#c084fc',
    bgColor: 'rgba(192,132,252,0.15)',
    borderColor: 'rgba(192,132,252,0.4)',
    gradientFrom: '#a855f7',
    gradientTo: '#c084fc',
    icon: '🪐',
    nextRankPoints: 1500,
  },
  {
    name: 'Supernova',
    label: 'Supernova',
    minPoints: 1500,
    maxPoints: null,
    color: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.15)',
    borderColor: 'rgba(251,191,36,0.5)',
    gradientFrom: '#f59e0b',
    gradientTo: '#fbbf24',
    icon: '💫',
    nextRankPoints: null,
  },
];

export function getLoyaltyRank(points: number): LoyaltyRank {
  for (let i = LOYALTY_RANKS.length - 1; i >= 0; i--) {
    if (points >= LOYALTY_RANKS[i].minPoints) return LOYALTY_RANKS[i];
  }
  return LOYALTY_RANKS[0];
}

/** Get rank by tier level (0=Stargazer, 1=Moonwalker, 2=Galaxian, 3=Supernova) */
export function getLoyaltyRankByTier(tierLevel: number): LoyaltyRank {
  return LOYALTY_RANKS[Math.max(0, Math.min(tierLevel, LOYALTY_RANKS.length - 1))];
}

/** Progress percentage to next rank (0–100) */
export function getRankProgress(points: number): number {
  const rank = getLoyaltyRank(points);
  if (!rank.nextRankPoints) return 100;
  const rangeSize = rank.nextRankPoints - rank.minPoints;
  const progress = points - rank.minPoints;
  return Math.min(100, Math.round((progress / rangeSize) * 100));
}

/** Max points redeemable: capped at 50% of subtotal, minimum 1 point */
export function calcMaxRedeemablePoints(userPoints: number, subtotal: number): number {
  const maxByBalance = userPoints;
  const maxBySubtotal = Math.floor(subtotal * 0.5); // max 50% discount
  return Math.max(0, Math.min(maxByBalance, maxBySubtotal));
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchLoyaltyPoints(userId: string, signal?: AbortSignal): Promise<LoyaltyPointsBalance | null> {
  const { data, error } = await supabase
    .from('customer_loyalty_points')
    .select('total_points, tier_level, updated_at')
    .eq('user_id', userId)
    .abortSignal(signal as AbortSignal)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

async function fetchLoyaltyHistory(userId: string, signal?: AbortSignal): Promise<LoyaltyPointsHistoryItem[]> {
  const { data, error } = await supabase
    .from('loyalty_points_history')
    .select('id, points_change, reason, order_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
    .abortSignal(signal as AbortSignal);

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLoyaltyPoints(userId: string | undefined) {
  return useQuery({
    queryKey: ['loyalty-points', userId],
    queryFn: ({ signal }) => fetchLoyaltyPoints(userId!, signal),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useLoyaltyHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['loyalty-history', userId],
    queryFn: ({ signal }) => fetchLoyaltyHistory(userId!, signal),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
