import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCallback } from 'react'

export type AuditAction =
  | 'admin_role_assigned'
  | 'payment_refunded'
  | 'voucher_modified'
  | 'stock_adjusted'
  | 'order_cancelled'
  | 'loyalty_points_redeemed'
  | 'customer_data_exported'
  | 'admin_division_assigned'
  | 'price_modified'
  | 'order_status_changed'
  | 'product_modified'
  | 'ticket_scanned'
  | 'order_created'
  | 'product_order_created'
  | 'dashboard_modified'
  | 'user_logged_in'

export interface AuditLog {
  id: string
  user_id: string
  action: AuditAction
  table_name: string
  record_id: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  description: string | null
  created_at: string
  user_email?: string
  user_role?: string
}

export interface AuditLogFilters {
  action?: AuditAction
  table_name?: string
  user_email?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * Hook to fetch audit logs with optional filtering
 */
export function useAuditLogs(filters?: AuditLogFilters) {
  const { user } = useAuth()

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      if (!user?.id) return []

      try {
        // Find user_id if user_email filter is provided
        let filterUserId: string | undefined = undefined;
        const { data: usersData } = await supabase.rpc('get_admin_users');
        const adminUsers = usersData || [];
        
        if (filters?.user_email) {
          const found = adminUsers.find((u: any) => u.email.toLowerCase() === filters.user_email!.toLowerCase());
          if (found) {
            filterUserId = found.user_id;
          } else {
            // If email not found in admins, return empty since no logs will match
            return [];
          }
        }

        let query = supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })

        // Apply filters
        if (filterUserId) {
          query = query.eq('user_id', filterUserId);
        }

        if (filters?.action) {
          query = query.eq('action', filters.action)
        }

        if (filters?.table_name) {
          query = query.eq('table_name', filters.table_name)
        }

        if (filters?.startDate) {
          query = query.gte('created_at', filters.startDate.toISOString())
        }

        if (filters?.endDate) {
          const endOfDay = new Date(filters.endDate)
          endOfDay.setHours(23, 59, 59, 999)
          query = query.lte('created_at', endOfDay.toISOString())
        }

        // Pagination
        const limit = filters?.limit || 50
        const offset = filters?.offset || 0
        query = query.range(offset, offset + limit - 1)

        const { data, error: err } = await query

        if (err) throw err

        const rawLogs = (data || []) as AuditLog[]
        if (rawLogs.length === 0) return []

        // Fetch user roles and emails to map to user_id (using previously fetched adminUsers)
        const userMap = new Map<string, { email: string; role: string }>(
          adminUsers.map((u: any) => [u.user_id, { email: u.email, role: u.role_name }])
        )

        return rawLogs.map((log) => ({
          ...log,
          user_email: userMap.get(log.user_id)?.email,
          user_role: userMap.get(log.user_id)?.role,
        }))
      } catch (error) {
        console.error('Error fetching audit logs:', error)
        return []
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
  })

  return {
    logs,
    isLoading,
    error: error as Error | null,
  }
}

/**
 * Hook to get audit log statistics
 */
export function useAuditLogStats(days: number = 7) {
  const { user } = useAuth()

  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ['audit-log-stats', days],
    queryFn: async () => {
      if (!user?.id) return {}

      try {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const { data } = await supabase
          .from('audit_logs')
          .select('action')
          .gte('created_at', startDate.toISOString())

        // Count by action
        const counts = (data || []).reduce(
          (acc: Record<string, number>, log: any) => {
            acc[log.action] = (acc[log.action] || 0) + 1
            return acc
          },
          {}
        )

        return {
          total: data?.length || 0,
          byAction: counts,
        }
      } catch (error) {
        console.error('Error fetching audit stats:', error)
        return { total: 0, byAction: {} }
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return { stats, isLoading }
}

/**
 * Hook to export audit logs as CSV
 */
export function useExportAuditLogs() {
  const { user } = useAuth()

  const exportToCSV = useCallback(
    async (filters?: AuditLogFilters) => {
      if (!user?.id) return

      try {
        let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false })

        // Apply same filters
        if (filters?.action) query = query.eq('action', filters.action)
        if (filters?.table_name) query = query.eq('table_name', filters.table_name)
        if (filters?.startDate) query = query.gte('created_at', filters.startDate.toISOString())
        if (filters?.endDate) {
          const endOfDay = new Date(filters.endDate)
          endOfDay.setHours(23, 59, 59, 999)
          query = query.lte('created_at', endOfDay.toISOString())
        }

        // Limit to 10000 records for export
        query = query.limit(10000)

        const { data, error: err } = await query

        if (err) throw err

        // Convert to CSV
        const logs = (data || []) as AuditLog[]
        if (logs.length === 0) {
          alert('No audit logs to export')
          return
        }

        const headers = ['ID', 'User ID', 'Action', 'Table', 'Record ID', 'Old Values', 'New Values', 'Description', 'IP Address', 'User Agent', 'Created At']
        const rows = logs.map((log) => [
          log.id,
          log.user_id,
          log.action,
          log.table_name,
          log.record_id,
          JSON.stringify(log.old_values || {}),
          JSON.stringify(log.new_values || {}),
          log.description || '',
          log.ip_address || '',
          log.user_agent || '',
          new Date(log.created_at).toLocaleString(),
        ])

        const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.setAttribute('href', URL.createObjectURL(blob))
        link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('Error exporting audit logs:', error)
        alert('Failed to export audit logs')
      }
    },
    [user?.id]
  )

  return { exportToCSV }
}

/**
 * Hook to get details about a specific record's audit history
 */
export function useRecordAuditHistory(tableName: string, recordId: string) {
  const { user } = useAuth()

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['record-audit-history', tableName, recordId],
    queryFn: async () => {
      if (!user?.id || !tableName || !recordId) return []

      try {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('table_name', tableName)
          .eq('record_id', recordId)
          .order('created_at', { ascending: true })

        return (data || []) as AuditLog[]
      } catch (error) {
        console.error('Error fetching record audit history:', error)
        return []
      }
    },
    enabled: !!user?.id && !!tableName && !!recordId,
    staleTime: 60 * 1000, // 1 minute
  })

  return { history, isLoading }
}
