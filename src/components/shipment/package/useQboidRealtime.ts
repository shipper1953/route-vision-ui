
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QboidDimensions, ConnectionStatus } from './types';

interface UseQboidRealtimeProps {
  handleQboidData: (dimensions: QboidDimensions) => Promise<void>;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useQboidRealtime = ({ handleQboidData, setConnectionStatus }: UseQboidRealtimeProps) => {
  useEffect(() => {
    console.log('Setting up Qboid realtime listener');
    
    // Subscribe to realtime events from Qboid
    const channel = supabase
      .channel('qboid-dimensions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qboid_events',
          filter: 'event_type=eq.dimensions_received'
        },
        (payload) => {
          console.log('Realtime Qboid event received:', payload);
          
          if (payload.new && payload.new.data) {
            const eventData = payload.new.data as QboidDimensions;
            handleQboidData(eventData);
          }
        }
      )
      .subscribe((status) => {
        console.log('Qboid subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connecting');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Qboid subscription');
      channel.unsubscribe();
    };
  }, [handleQboidData, setConnectionStatus]);
};
