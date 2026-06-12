import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export type DivisionType = 'tiket' | 'dressing_room' | 'retail'

export interface AdminDivision {
  division_id: string
  division_name: DivisionType
  display_name: string
}

export function useAdminDivisions() {
  const { user } = useAuth()

  const { data: divisions = [], isLoading } = useQuery({
    queryKey: ['admin-divisions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      try {
        // Check if user is super admin
        const { data: roleData } = await supabase
          .from('user_role_assignments')
          .select('role_name')
          .eq('user_id', user.id)
          .maybeSingle()

        if (roleData?.role_name === 'super_admin') {
          // Super admin has all divisions
          const { data } = await supabase.from('divisions').select('id, name, display_name').order('name')

          return (
            data?.map((d) => ({
              division_id: d.id,
              division_name: d.name as DivisionType,
              display_name: d.display_name,
            })) || []
          )
        }

        // Regular admin - get assigned divisions using RPC
        const { data } = await supabase.rpc('get_user_divisions', {
          p_user_id: user.id,
        })

        return (
          data?.map((d: Record<string, any>) => ({
            division_id: d.division_id,
            division_name: d.division_name as DivisionType,
            display_name: d.display_name,
          })) || []
        )
      } catch (error) {
        console.error('Error fetching admin divisions:', error)
        return []
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const hasMultipleDivisions = divisions.length > 1
  const isSingleDivision = divisions.length === 1
  const firstDivision = divisions[0]

  return {
    divisions,
    isLoading,
    hasMultipleDivisions,
    isSingleDivision,
    firstDivision,
  }
}

/**
 * Hook to check if user has access to a specific division
 */
export function useDivisionAccess(divisionName: DivisionType) {
  const { user } = useAuth()
  const { divisions } = useAdminDivisions()

  const hasAccess = divisions.some((d: AdminDivision) => d.division_name === divisionName)

  return {
    hasAccess,
    isChecking: !user?.id,
  }
}

/**
 * Hook to get all available divisions (for admin UI)
 */
export function useAllDivisions() {
  return useQuery({
    queryKey: ['all-divisions'],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('divisions').select('id, name, display_name').order('name')

        return (
          data?.map((d) => ({
            division_id: d.id,
            division_name: d.name as DivisionType,
            display_name: d.display_name,
          })) || []
        )
      } catch (error) {
        console.error('Error fetching all divisions:', error)
        return []
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
