import { useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/contexts/AuthContext'
import { ADMIN_MENU_ITEMS } from '@/constants/adminMenu'
import { useAdminMenuSections } from '@/hooks/useAdminMenuSections'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { DivisionBadge } from '@/components/admin/DivisionFilter'
import type { DivisionType } from '@/hooks/useAdminDivisions'
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'

interface Admin {
  user_id: string
  email: string
  role_name: string
  divisions: Array<{
    division_id: string
    division_name: DivisionType
    display_name: string
  }>
}

interface Division {
  id: string
  name: DivisionType
  display_name: string
  description: string | null
}

export function DivisionManager() {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const menuSections = useAdminMenuSections()
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)
  const [selectedDivision, setSelectedDivision] = useState<DivisionType | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch all admins and their divisions
  const { data: admins = [] as Admin[], isLoading: adminsLoading } = useQuery<Admin[]>({
    queryKey: ['admins-with-divisions'],
    queryFn: async () => {
      const { data: adminUsers, error: adminsError } = await supabase.rpc('get_admin_users')

      if (adminsError || !adminUsers) {
        console.error('Error fetching admins:', adminsError)
        return []
      }

      const adminPromises = adminUsers.map(async (admin: any) => {
        // Get divisions
        const { data: divisions } = await supabase.rpc('get_user_divisions', {
          p_user_id: admin.user_id,
        })

        return {
          user_id: admin.user_id,
          email: admin.email || 'Unknown',
          role_name: admin.role_name,
          divisions: (divisions || []).map((d: any) => ({
            division_id: d.division_id,
            division_name: d.division_name,
            display_name: d.display_name,
          })),
        } as Admin
      })

      return Promise.all(adminPromises)
    },
  })

  // Fetch all divisions
  const { data: divisions = [] } = useQuery({
    queryKey: ['all-divisions-management'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('*').order('name')
      return (data || []) as Division[]
    },
  })

  // Assign division mutation
  const assignDivision = useMutation({
    mutationFn: async ({ userId, divisionName }: { userId: string; divisionName: DivisionType }) => {
      if (!user?.id) throw new Error('Not authenticated')

      const divisionId = divisions.find((d) => d.name === divisionName)?.id
      if (!divisionId) throw new Error('Division not found')

      const { error } = await supabase.from('admin_divisions').insert({
        user_id: userId,
        division_id: divisionId,
      })

      if (error) {
        if ((error as any).code === '23505') {
          throw new Error('User already assigned to this division')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-with-divisions'] })
      setMessage({ type: 'success', text: 'Division assigned successfully' })
      setSelectedAdminId(null)
      setSelectedDivision(null)
      setTimeout(() => setMessage(null), 3000)
    },
    onError: (error) => {
      setMessage({ type: 'error', text: (error as Error).message })
      setTimeout(() => setMessage(null), 3000)
    },
  })

  // Remove division mutation
  const removeDivision = useMutation({
    mutationFn: async ({ userId, divisionName }: { userId: string; divisionName: DivisionType }) => {
      if (!user?.id) throw new Error('Not authenticated')

      const divisionId = divisions.find((d) => d.name === divisionName)?.id
      if (!divisionId) throw new Error('Division not found')

      const { error } = await supabase.from('admin_divisions').delete().eq('user_id', userId).eq('division_id', divisionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins-with-divisions'] })
      setMessage({ type: 'success', text: 'Division removed successfully' })
      setTimeout(() => setMessage(null), 3000)
    },
    onError: (error) => {
      setMessage({ type: 'error', text: (error as Error).message })
      setTimeout(() => setMessage(null), 3000)
    },
  })

  if (adminsLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  const selectedAdmin = selectedAdminId ? admins.find((a) => a.user_id === selectedAdminId) : null
  const availableDivisionsForSelectedAdmin = selectedAdmin
    ? divisions.filter((d) => !selectedAdmin.divisions.some((ad) => ad.division_name === d.name))
    : []

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="divisions"
      title="Kelola Divisi"
      subtitle="Manage admin division assignments"
      onLogout={signOut}
    >
    <div className="space-y-6">
      {/* Messages */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Division Assignment Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Assign Division to Admin</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Select Admin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Admin</label>
            <select
              value={selectedAdminId || ''}
              onChange={(e) => {
                setSelectedAdminId(e.target.value || null)
                setSelectedDivision(null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an admin...</option>
              {admins
                .filter((a) => a.role_name !== 'super_admin')
                .map((admin) => (
                  <option key={admin.user_id} value={admin.user_id}>
                    {admin.email}
                  </option>
                ))}
            </select>
          </div>

          {/* Select Division */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Division</label>
            <select
              value={selectedDivision || ''}
              onChange={(e) => setSelectedDivision((e.target.value as DivisionType) || null)}
              disabled={!selectedAdminId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Choose a division...</option>
              {availableDivisionsForSelectedAdmin.map((div) => (
                <option key={div.id} value={div.name}>
                  {div.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            if (selectedAdminId && selectedDivision) {
              assignDivision.mutate({ userId: selectedAdminId, divisionName: selectedDivision })
            }
          }}
          disabled={!selectedAdminId || !selectedDivision || assignDivision.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={18} />
          Assign Division
        </button>
      </div>

      {/* Admins and Their Divisions */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Admin Divisions</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {admins.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">No admins found</div>
          ) : (
            admins.map((admin) => (
              <div key={admin.user_id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{admin.email}</p>
                    <p className="text-sm text-gray-600 capitalize">{admin.role_name.replace('_', ' ')}</p>
                  </div>
                </div>

                {/* Divisions for this admin */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {admin.divisions.length === 0 ? (
                    <p className="text-sm text-gray-500">No divisions assigned</p>
                  ) : (
                    admin.divisions.map((div) => (
                      <div key={div.division_id} className="flex items-center gap-2">
                        <DivisionBadge division={div.division_name} />
                        <button
                          onClick={() => removeDivision.mutate({ userId: admin.user_id, divisionName: div.division_name })}
                          disabled={removeDivision.isPending}
                          className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                          title="Remove division"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </AdminLayout>
  )
}

export default DivisionManager
