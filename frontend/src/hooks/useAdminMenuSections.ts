import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getMenuSectionsByRole } from '../utils/auth';
import { ADMIN_MENU_SECTIONS } from '../constants/adminMenu';
import type { AdminMenuSection } from '../components/AdminLayout';

/**
 * Returns the correct sidebar menu sections for the logged-in user's role.
 * Result is cached via React Query so it doesn't re-fetch on every page navigation,
 * preventing the sidebar "reload/flash" effect when navigating between admin pages.
 */
export function useAdminMenuSections(): AdminMenuSection[] {
  const { user } = useAuth();

  const { data = ADMIN_MENU_SECTIONS } = useQuery<AdminMenuSection[]>({
    queryKey: ['admin-menu-sections', user?.id],
    queryFn: () => getMenuSectionsByRole(user?.id),
    staleTime: 10 * 60 * 1000, // 10 minutes — role doesn't change mid-session
    gcTime: 30 * 60 * 1000,    // keep in cache for 30 minutes
    enabled: !!user?.id,
  });

  return data;
}
