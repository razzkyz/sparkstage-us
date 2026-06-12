import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/contexts/AuthContext'
import { ADMIN_MENU_ITEMS } from '@/constants/adminMenu'
import { useAdminMenuSections } from '@/hooks/useAdminMenuSections'
import { useAuditLogs, useExportAuditLogs, type AuditAction } from '@/hooks/useAuditLogs'
import { useOnlineAdmins } from '@/hooks/useOnlineAdmins'
import { Download, RotateCcw, Eye, ChevronUp, FileText, Search, Activity, Database, Calendar, UserRound } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ACTION_LABELS: Record<AuditAction, string> = {
  admin_role_assigned: 'Role Assigned',
  payment_refunded: 'Payment Refunded',
  voucher_modified: 'Voucher Modified',
  stock_adjusted: 'Stock Adjusted',
  order_cancelled: 'Order Cancelled',
  loyalty_points_redeemed: 'Loyalty Points Redeemed',
  customer_data_exported: 'Customer Data Exported',
  admin_division_assigned: 'Division Assigned',
  price_modified: 'Price Modified',
  order_status_changed: 'Order Status Changed',
  product_modified: 'Product Modified',
  ticket_scanned: 'Ticket Scanned',
  order_created: 'Event Order Created',
  product_order_created: 'Product Order Created',
  dashboard_modified: 'Dashboard Modified',
  user_logged_in: 'User Logged In',
}

const TABLE_LABELS: Record<string, string> = {
  user_role_assignments: 'User Roles',
  payments: 'Payments',
  vouchers: 'Vouchers',
  product_inventory: 'Inventory',
  orders: 'Orders',
  customer_loyalty_points: 'Loyalty Points',
  admin_divisions: 'Admin Divisions',
  products: 'Products',
  product_orders: 'Product Orders',
  purchased_tickets: 'Purchased Tickets',
  booking_page_settings: 'Booking Settings',
  glam_page_settings: 'Glam Settings',
  charm_bar_settings: 'Charm Bar Settings',
  event_page_settings: 'Event Settings',
  news_settings: 'News Settings',
  events_schedule: 'Events Schedule',
  events_schedule_items: 'Schedule Items',
  beauty_posters: 'Beauty Posters',
}

export function AuditLogsPage() {
  const { user, signOut } = useAuth()
  const menuSections = useAdminMenuSections()
  const onlineAdmins = useOnlineAdmins()
  const [selectedAction, setSelectedAction] = useState<AuditAction | ''>('')
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [adminEmailFilter, setAdminEmailFilter] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.id) {
      import('@/auth/adminRole').then(({ lookupUserRole }) => {
        lookupUserRole(user.id).then((result) => {
          if (result.ok) {
            const role = result.role?.toLowerCase()
            if (role !== 'admin' && role !== 'super_admin' && role !== 'devops') {
              navigate('/admin/dashboard', { replace: true })
            }
          }
        })
      })
    }
  }, [user, navigate])

  const pageSize = 25

  // Build filters
  const filters = useMemo(() => {
    const f: any = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }

    if (selectedAction) f.action = selectedAction
    if (selectedTable) f.table_name = selectedTable
    if (adminEmailFilter) f.user_email = adminEmailFilter
    if (startDate) f.startDate = new Date(startDate)
    if (endDate) f.endDate = new Date(endDate)

    return f
  }, [selectedAction, selectedTable, adminEmailFilter, startDate, endDate, page])

  const { logs, isLoading } = useAuditLogs(filters)
  const { exportToCSV } = useExportAuditLogs()

  const handleReset = () => {
    setSelectedAction('')
    setSelectedTable('')
    setAdminEmailFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedRows(newExpanded)
  }

  const handleExport = () => {
    exportToCSV({
      action: selectedAction || undefined,
      table_name: selectedTable || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="audit-logs"
      title="Audit Logs"
      subtitle="Track all admin activities and system changes"
      onLogout={signOut}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-70"></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="text-indigo-500" size={24} />
              System Audit Logs
            </h1>
            <p className="text-slate-500 mt-1 text-sm mb-3">Monitor security events, system modifications, and administrative actions.</p>
            {onlineAdmins.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs font-semibold text-slate-400 self-center mr-1">ONLINE:</span>
                {onlineAdmins.map((email) => (
                  <div key={email} className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-medium border border-green-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    {email}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleReset} 
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl border border-slate-200 transition-colors text-sm"
            >
              <RotateCcw size={16} />
              Reset Filters
            </button>
            <button 
              onClick={handleExport} 
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm shadow-indigo-600/20 transition-all text-sm"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><UserRound size={12}/> Admin Email</label>
              <input 
                type="text" 
                placeholder="e.g. admin@gmail.com"
                value={adminEmailFilter} 
                onChange={(e) => { setAdminEmailFilter(e.target.value); setPage(1) }} 
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium text-slate-700 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity size={12}/> Action Type</label>
              <select 
                value={selectedAction} 
                onChange={(e) => { setSelectedAction((e.target.value as AuditAction) || ''); setPage(1) }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium text-slate-700 transition-all"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Database size={12}/> Table</label>
              <select 
                value={selectedTable} 
                onChange={(e) => { setSelectedTable(e.target.value); setPage(1) }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium text-slate-700 transition-all"
              >
                <option value="">All Tables</option>
                {Object.entries(TABLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12}/> Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }} 
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium text-slate-700 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12}/> End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }} 
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium text-slate-700 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col min-h-[500px]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Table</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                        <span className="font-medium">Loading audit logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                          <Search size={24} className="text-slate-300" />
                        </div>
                        <span className="font-medium">No audit logs found matching your criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expandedRows.has(log.id)
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium text-xs">
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              timeZone: 'Asia/Jakarta',
                              year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                              timeZoneName: 'short'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{log.user_email || log.user_id.substring(0, 8)}</span>
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">{log.user_role || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                              {ACTION_LABELS[log.action] || log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                              <Database size={10} className="mr-1.5" />
                              {TABLE_LABELS[log.table_name] || log.table_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.description || '-'}>
                            {log.description || '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => toggleExpand(log.id)}
                              className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <Eye size={16} />}
                            </button>
                          </td>
                        </tr>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <td colSpan={6} className="px-0 py-0 border-b border-slate-100 bg-indigo-50/30">
                                <div className="p-6">
                                  <div className="bg-white rounded-xl border border-indigo-100 p-5 shadow-sm">
                                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                                      <FileText size={18} className="text-indigo-500"/>
                                      Event Details
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Record ID</span>
                                        <code className="text-sm font-medium text-slate-700">{log.record_id}</code>
                                      </div>
                                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">User ID</span>
                                        <code className="text-sm font-medium text-slate-700">{log.user_id}</code>
                                      </div>
                                      {log.ip_address && (
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">IP Address</span>
                                          <code className="text-sm font-medium text-slate-700">{log.ip_address}</code>
                                        </div>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                      {log.old_values && Object.keys(log.old_values).length > 0 && (
                                        <div>
                                          <span className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Previous Values</span>
                                          <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs overflow-x-auto border border-slate-800 shadow-inner">
                                            {JSON.stringify(log.old_values, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      
                                      {log.new_values && Object.keys(log.new_values).length > 0 && (
                                        <div>
                                          <span className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">New Values</span>
                                          <pre className="bg-slate-900 text-emerald-300 p-4 rounded-xl text-xs overflow-x-auto border border-slate-800 shadow-inner">
                                            {JSON.stringify(log.new_values, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between mt-auto">
            <span className="text-sm font-medium text-slate-500">
              Showing page <span className="font-bold text-slate-800">{page}</span>
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => p + 1)} 
                disabled={logs.length < pageSize}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AuditLogsPage
