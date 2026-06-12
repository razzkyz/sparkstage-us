import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { lookupUserRole } from '../../auth/adminRole'
import { AppLoadingScreen } from '../../app/AppLoadingScreen'

/**
 * Role-based dashboard router
 * Routes users to the correct dashboard based on their role
 */
export const AdminDashboardRouter = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleRouting = async () => {
      if (!user?.id) {
        navigate('/login')
        return
      }

      const result = await lookupUserRole(user.id)

      if (!result.ok) {
        // Error fetching role
        navigate('/login?reason=role_error')
        return
      }

      const role = result.role?.toLowerCase()

      // Route based on role
      switch (role) {
        case 'admin':
        case 'super_admin':
        case 'super-admin':
          navigate('/admin/dashboard')
          break
        case 'kasir':
          navigate('/admin/cashier-dashboard')
          break
        case 'starguide':
          navigate('/admin/entrance-dashboard')
          break
        case 'dressing_room_admin':
        case 'dress':
          navigate('/admin/dashboard')
          break
        case 'devops':
          navigate('/admin/audit-logs')
          break
        case 'ticket_admin':
          navigate('/admin/ticket-dashboard')
          break
        case 'retail_admin':
          navigate('/admin/retail-dashboard')
          break
        default:
          // Not an admin, redirect home
          navigate('/')
      }
    }

    handleRouting()
  }, [user, navigate])

  return <AppLoadingScreen />
}
