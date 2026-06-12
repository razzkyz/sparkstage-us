import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface ReferralCode {
  code: string
  total_referrals: number
  total_bonus_points: number
  code_is_active: boolean
  code_expires_at: string | null
  code_created_at: string
}

export interface ReferredUser {
  referred_user_id: string
  referred_user_email: string
  referral_code: string
  points_awarded: number
  referred_at: string
}

/**
 * Hook to manage user's referral code
 */
export function useReferralCode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Get referral code stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      try {
        const { data } = await supabase.rpc('get_referral_stats', {
          p_user_id: user.id,
        })

        return data?.[0] as ReferralCode | null
      } catch (error) {
        console.error('Error fetching referral stats:', error)
        return null
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Get referred users
  const { data: referredUsers = [], isLoading: referralsLoading } = useQuery({
    queryKey: ['referred-users', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      try {
        const { data } = await supabase.rpc('get_referred_users', {
          p_user_id: user.id,
        })

        return (data || []) as ReferredUser[]
      } catch (error) {
        console.error('Error fetching referred users:', error)
        return []
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  // Create new referral code
  const createCode = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('create_referral_code', {
        p_user_id: user.id,
        p_max_uses: null,
        p_expires_at: null,
      })

      if (error) throw error
      return data?.[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-stats', user?.id] })
    },
  })

  return {
    stats,
    referredUsers,
    statsLoading: statsLoading || referralsLoading,
    createCode,
  }
}

/**
 * Hook to apply a referral code during checkout/signup
 */
export function useApplyReferralCode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const applyCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user?.id) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('apply_referral_code', {
        p_code: code.toUpperCase(),
        p_referred_user_id: user.id,
      })

      if (error) throw error

      const result = data?.[0]
      if (!result.success) {
        throw new Error(result.message)
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-points', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] })
    },
  })

  return { applyCode }
}

/**
 * Hook to manage customer loyalty points (admin)
 */
export interface LoyaltyPointsRecord {
  user_id: string
  email: string
  total_points: number
  tier_level: number
}

export function useAdminLoyaltyPoints() {
  const queryClient = useQueryClient()

  // Fetch all customers with loyalty points
  const { data: customers = [] as LoyaltyPointsRecord[], isLoading } = useQuery<LoyaltyPointsRecord[]>({
    queryKey: ['admin-loyalty-customers'],
    queryFn: async () => {
      try {
        // Get all users
        const { data: users, error: usersError } = await supabase.rpc('get_all_users_for_admin')
        if (usersError) throw usersError
        if (!users || users.length === 0) return []

        // Get loyalty points for all users
        const { data: points, error: pointsError } = await supabase
          .from('customer_loyalty_points')
          .select('user_id, total_points, tier_level')

        if (pointsError) {
          console.error('Error fetching loyalty points:', pointsError)
          return users.map((u: any) => ({
            user_id: u.user_id,
            email: u.email || '',
            total_points: 0,
            tier_level: 0,
          }))
        }

        // Merge users with their loyalty points
        return users.map((u: any) => {
          const pointsRecord = points?.find((p: any) => p.user_id === u.user_id)
          return {
            user_id: u.user_id,
            email: u.email || '',
            total_points: pointsRecord?.total_points || 0,
            tier_level: pointsRecord?.tier_level || 0,
          }
        })
      } catch (error) {
        console.error('Error fetching loyalty customers:', error)
        return []
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Award bonus points to customer
  const awardPoints = useMutation({
    mutationFn: async ({ userId, points, reason }: { userId: string; points: number; reason: string }) => {
      // For admin bonus, insert directly to loyalty_points_history (similar to redemption flow)
      const { data, error } = await supabase
        .from('loyalty_points_history')
        .insert({
          user_id: userId,
          points_change: points,
          reason: reason || 'Admin bonus award',
          order_id: null,
          created_at: new Date().toISOString(),
        })

      if (error) throw error

      // Also update total_points directly
      await supabase.rpc('award_admin_bonus', {
        p_user_id: userId,
        p_points: points,
        p_reason: reason || 'Admin bonus award',
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-customers'] })
    },
  })

  // Deduct points from customer
  const deductPoints = useMutation({
    mutationFn: async ({ userId, points, reason }: { userId: string; points: number; reason: string }) => {
      // Record negative points change
      const { data, error } = await supabase
        .from('loyalty_points_history')
        .insert({
          user_id: userId,
          points_change: -points,
          reason: reason || 'Admin deduction',
          order_id: null,
          created_at: new Date().toISOString(),
        })

      if (error) throw error

      // Update total_points directly
      await supabase.rpc('deduct_admin_points', {
        p_user_id: userId,
        p_points: points,
        p_reason: reason || 'Admin deduction',
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-customers'] })
    },
  })

  return {
    customers,
    isLoading,
    awardPoints,
    deductPoints,
  }
}

export interface CustomerStats {
  totalCustomers: number
  emailRegistered: number
  googleOAuth: number
  withLoyaltyPoints: number
}

/**
 * Hook to get accurate customer registration statistics
 * Counts all registered users from auth.users table
 */
export function useTotalCustomerCount() {
  const { data: stats, isLoading, error } = useQuery<CustomerStats>({
    queryKey: ['total-customer-count'],
    queryFn: async () => {
      try {
        // Get total customer count from the accurate RPC function
        const { data: countData, error: countError } = await supabase.rpc(
          'get_customer_registration_stats'
        )

        if (countError) throw countError

        if (!countData || countData.length === 0) {
          return {
            totalCustomers: 0,
            emailRegistered: 0,
            googleOAuth: 0,
            withLoyaltyPoints: 0,
          }
        }

        const result = countData[0]
        return {
          totalCustomers: Number(result.total_customers) || 0,
          emailRegistered: Number(result.email_registered) || 0,
          googleOAuth: Number(result.google_oauth) || 0,
          withLoyaltyPoints: Number(result.with_loyalty_points) || 0,
        }
      } catch (error) {
        console.error('Error fetching customer statistics:', error)
        return {
          totalCustomers: 0,
          emailRegistered: 0,
          googleOAuth: 0,
          withLoyaltyPoints: 0,
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    stats: stats || { totalCustomers: 0, emailRegistered: 0, googleOAuth: 0, withLoyaltyPoints: 0 },
    isLoading,
    error,
  }
}
