import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useOrderCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false); // US version: simplified, instant
  const { initialized } = useAuth();

  useEffect(() => {
    // US VERSION: Order count is handled differently
    // Product orders exist but count badge not critical for navbar
    // Return 0 to avoid query errors
    if (!initialized) {
      return;
    }

    setCount(0);
    setLoading(false);
  }, [initialized]);

  const refetch = () => Promise.resolve();

  return { count, loading, refetch };
};

