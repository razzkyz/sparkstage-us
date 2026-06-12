import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { lookupUserRole } from '../auth/adminRole';

interface UseUserRoleResult {
  role: string | undefined;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to get the current user's role
 * Returns role string ('kasir', 'admin', 'dressing_room_admin', etc.)
 * or undefined if user has no role assigned
 */
export function useUserRole(): UseUserRoleResult {
  const { user } = useAuth();
  const [role, setRole] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setRole(undefined);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      setError(null);

      const result = await lookupUserRole(user.id);

      if (result.ok) {
        setRole(result.role);
        setError(null);
      } else {
        setRole(undefined);
        setError(
          new Error(
            result.transient
              ? 'Temporary error fetching user role'
              : 'Failed to fetch user role'
          )
        );
      }

      setLoading(false);
    };

    void fetchRole();
  }, [user?.id]);

  return { role, loading, error };
}
