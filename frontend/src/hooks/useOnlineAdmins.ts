import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useOnlineAdmins() {
  const [onlineAdmins, setOnlineAdmins] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase.channel('admin-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // presenceState returns an object with keys being the presence identifiers
        const emails = Object.keys(state).filter(Boolean);
        setOnlineAdmins(emails);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineAdmins;
}
