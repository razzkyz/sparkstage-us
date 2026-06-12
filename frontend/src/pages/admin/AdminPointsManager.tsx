import { useState, useMemo } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/contexts/AuthContext'
import { ADMIN_MENU_ITEMS } from '@/constants/adminMenu'
import { useAdminMenuSections } from '@/hooks/useAdminMenuSections'
import { useAdminLoyaltyPoints, useTotalCustomerCount } from '@/hooks/useReferralCode'
import { Plus, Minus, AlertCircle, CheckCircle, Search, Trophy, Users, Gift } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function getTierInfo(tier_level: number) {
  const tiers = [
    { name: 'Stargazer', color: 'text-slate-500', bg: 'bg-slate-100', icon: '⭐', border: 'border-slate-200' },
    { name: 'Moonwalker', color: 'text-blue-600', bg: 'bg-blue-100', icon: '🌙', border: 'border-blue-200' },
    { name: 'Galaxian', color: 'text-purple-600', bg: 'bg-purple-100', icon: '🪐', border: 'border-purple-200' },
    { name: 'Supernova', color: 'text-orange-600', bg: 'bg-orange-100', icon: '💫', border: 'border-orange-200' },
  ]
  return tiers[tier_level] || tiers[0]
}

export function AdminPointsManager() {
  const { signOut } = useAuth()
  const menuSections = useAdminMenuSections()
  const [searchEmail, setSearchEmail] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [pointsAmount, setPointsAmount] = useState('')
  const [reason, setReason] = useState('')
  const [operation, setOperation] = useState<'award' | 'deduct'>('award')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { customers, isLoading, awardPoints, deductPoints } = useAdminLoyaltyPoints()
  const { stats: customerStats } = useTotalCustomerCount()

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => c.email.toLowerCase().includes(searchEmail.toLowerCase()))
  }, [customers, searchEmail])

  const ITEMS_PER_PAGE = 8
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE))
  
  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredCustomers, page])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchEmail(e.target.value)
    setPage(1)
  }

  const selectedCustomer = customers.find((c) => c.user_id === selectedUserId)

  const stats = useMemo(() => {
    const totalPoints = customers.reduce((acc, curr) => acc + (curr.total_points || 0), 0)
    const activeTiers = customers.filter(c => c.tier_level > 0).length
    return {
      totalCustomers: customerStats.totalCustomers,
      totalPoints,
      activeTiers
    }
  }, [customers, customerStats.totalCustomers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUserId || !pointsAmount || !reason) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    const points = parseInt(pointsAmount)
    if (isNaN(points) || points <= 0) {
      setMessage({ type: 'error', text: 'Points must be a positive number' })
      return
    }

    try {
      if (operation === 'award') {
        await awardPoints.mutateAsync({ userId: selectedUserId, points, reason })
        setMessage({ type: 'success', text: `Awarded ${points} points to ${selectedCustomer?.email}` })
      } else {
        await deductPoints.mutateAsync({ userId: selectedUserId, points, reason })
        setMessage({ type: 'success', text: `Deducted ${points} points from ${selectedCustomer?.email}` })
      }

      setPointsAmount('')
      setReason('')
      setSelectedUserId(null)
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="loyalty-points"
      title="Loyalty Points"
      subtitle="Manage customer loyalty program"
      onLogout={signOut}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Loyalty Points Manager</h1>
            <p className="text-slate-500 mt-1">Reward and manage your most loyal customers</p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <motion.div whileHover={{ y: -2 }} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 flex-1 md:w-40">
              <div className="flex items-center gap-3 text-slate-500 mb-1">
                <Users size={16} />
                <span className="text-sm font-medium">Customers</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">{stats.totalCustomers}</div>
            </motion.div>
            
            <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-4 shadow-sm border border-blue-100 flex-1 md:w-40">
              <div className="flex items-center gap-3 text-blue-600 mb-1">
                <Gift size={16} />
                <span className="text-sm font-medium">Total Points</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.totalPoints.toLocaleString()}</div>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 shadow-sm border border-amber-100 flex-1 md:w-40 hidden sm:block">
              <div className="flex items-center gap-3 text-amber-600 mb-1">
                <Trophy size={16} />
                <span className="text-sm font-medium">VIP Tiers</span>
              </div>
              <div className="text-2xl font-bold text-amber-900">{stats.activeTiers}</div>
            </motion.div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl flex items-center gap-3 font-medium shadow-sm border ${
                message.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {message.type === 'success' ? <CheckCircle size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-red-600" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Customer List */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 h-[600px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-60 translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">Select Customer</h2>
              </div>

              <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by email..." 
                  value={searchEmail} 
                  onChange={handleSearchChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Loading customers...</p>
                  </div>
                ) : paginatedCustomers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                      <Users size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium">No customers found</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {paginatedCustomers.map((customer) => {
                      const tier = getTierInfo(customer.tier_level)
                      const isSelected = selectedUserId === customer.user_id
                      
                      return (
                        <motion.button
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={customer.user_id}
                          onClick={() => setSelectedUserId(customer.user_id)}
                          className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border flex items-center gap-4 ${
                            isSelected 
                              ? 'bg-indigo-50/50 border-indigo-300 shadow-sm ring-1 ring-indigo-500/10' 
                              : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tier.bg} ${tier.color} ${isSelected ? 'shadow-sm' : ''} text-lg`}>
                            {tier.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold truncate text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                              {customer.email}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-2">
                              <span>{customer.total_points.toLocaleString()} points</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span className={tier.color}>{tier.name}</span>
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                )}
              </div>

              {/* Pagination Controls */}
              {!isLoading && filteredCustomers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Page {page} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 font-medium hover:bg-slate-50 transition-colors"
                    >
                      Prev
                    </button>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 font-medium hover:bg-slate-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Operation Form */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/40 border border-slate-200/60 sticky top-6">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Gift className="text-indigo-500" size={22} />
                Adjust Points
              </h2>

              {selectedCustomer ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Selected Customer Card */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-5 text-white shadow-md"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                      <div className="text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-1">Selected Customer</div>
                      <div className="font-bold text-lg truncate mb-4">{selectedCustomer.email}</div>
                      
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-indigo-200 text-xs mb-1">Current Points</div>
                          <div className="text-3xl font-black">{selectedCustomer.total_points.toLocaleString()}</div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/20 flex items-center gap-1.5`}>
                          {(() => {
                            const t = getTierInfo(selectedCustomer.tier_level);
                            return <><span className="text-sm">{t.icon}</span> {t.name}</>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Operation Type</label>
                      <div className="flex gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setOperation('award')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            operation === 'award' 
                              ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                          }`}
                        >
                          <Plus size={16} />
                          Award
                        </button>
                        <button
                          type="button"
                          onClick={() => setOperation('deduct')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            operation === 'deduct' 
                              ? 'bg-white text-red-600 shadow-sm border border-slate-200/50' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                          }`}
                        >
                          <Minus size={16} />
                          Deduct
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Points Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={pointsAmount}
                          onChange={(e) => setPointsAmount(e.target.value)}
                          placeholder="e.g. 500"
                          required
                          className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-800 outline-none"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase tracking-wider pointer-events-none">
                          Pts
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Reason</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Brief explanation for this adjustment..."
                        rows={3}
                        required
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={awardPoints.isPending || deductPoints.isPending}
                    className={`w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                      awardPoints.isPending || deductPoints.isPending
                        ? 'bg-slate-400 cursor-not-allowed shadow-none'
                        : operation === 'award'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/20'
                          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/20'
                    }`}
                  >
                    {awardPoints.isPending || deductPoints.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : operation === 'award' ? (
                      <>
                        <Plus size={18} />
                        Confirm Award
                      </>
                    ) : (
                      <>
                        <Minus size={18} />
                        Confirm Deduction
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Gift className="text-slate-300" size={24} />
                  </div>
                  <h3 className="text-slate-700 font-bold mb-1">No Customer Selected</h3>
                  <p className="text-slate-500 text-sm">Select a customer from the list on the left to adjust their loyalty points.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #cbd5e1;
        }
      `}</style>
    </AdminLayout>
  )
}

export default AdminPointsManager
