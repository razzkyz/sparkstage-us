import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useTicketCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false); // US version: no tickets, always 0
  const { initialized } = useAuth();

  useEffect(() => {
    // US VERSION: No ticket booking functionality
    // Always return 0 count
    if (!initialized) {
      return;
    }

    setCount(0);
    setLoading(false);
  }, [initialized]);

  return { count, loading };
};
