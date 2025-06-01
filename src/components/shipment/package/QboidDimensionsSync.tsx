
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ShipmentForm } from '@/types/shipment';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface QboidDimensionsSyncProps {
  orderId?: string;
}

export const QboidDimensionsSync = ({ orderId }: QboidDimensionsSyncProps) => {
  const form = useFormContext<ShipmentForm>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Function to fetch latest dimensions for the order
  const fetchLatestDimensions = async () => {
    if (!orderId) return;

    setIsRefreshing(true);
    try {
      console.log('Fetching latest Qboid dimensions for order:', orderId);
      
      // Search for the most recent Qboid event for this order
      const searchIds = [orderId, `ORD-${orderId}`, orderId.replace('ORD-', '')];
      
      const { data: events, error } = await supabase
        .from('qboid_events')
        .select('*')
        .eq('event_type', 'dimensions_received')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching Qboid events:', error);
        toast.error('Failed to fetch dimensions');
        return;
      }

      // Find matching event for this order
      const matchingEvent = events?.find(event => {
        const eventData = event.data as any;
        return searchIds.some(id => 
          eventData?.orderId === id || 
          eventData?.barcode === id ||
          String(eventData?.orderId) === String(id) ||
          String(eventData?.barcode) === String(id)
        );
      });

      if (matchingEvent) {
        const eventData = matchingEvent.data as any;
        const dimensions = eventData.dimensions || eventData;
        
        console.log('Found matching Qboid dimensions:', dimensions);
        
        // Update form with the dimensions
        if (dimensions.length) form.setValue('length', dimensions.length);
        if (dimensions.width) form.setValue('width', dimensions.width);
        if (dimensions.height) form.setValue('height', dimensions.height);
        if (dimensions.weight) form.setValue('weight', dimensions.weight);
        
        setLastUpdate(new Date().toLocaleTimeString());
        toast.success('Package dimensions updated from Qboid');
      } else {
        console.log('No Qboid dimensions found for order:', orderId);
        toast.info('No Qboid dimensions found for this order');
      }
    } catch (error) {
      console.error('Error fetching dimensions:', error);
      toast.error('Failed to fetch dimensions');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Set up real-time listener for new dimension events
  useEffect(() => {
    if (!orderId) return;

    console.log('Setting up real-time listener for Qboid dimensions, order:', orderId);
    
    const channel = supabase
      .channel('qboid-dimensions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qboid_events',
          filter: `event_type=eq.dimensions_received`
        },
        (payload) => {
          console.log('Real-time Qboid event received:', payload);
          
          const eventData = payload.new.data as any;
          const searchIds = [orderId, `ORD-${orderId}`, orderId.replace('ORD-', '')];
          
          // Check if this event is for our order
          const isForThisOrder = searchIds.some(id => 
            eventData?.orderId === id || 
            eventData?.barcode === id ||
            String(eventData?.orderId) === String(id) ||
            String(eventData?.barcode) === String(id)
          );
          
          if (isForThisOrder) {
            console.log('Real-time dimensions update for order:', orderId);
            const dimensions = eventData.dimensions || eventData;
            
            // Update form with the new dimensions
            if (dimensions.length) form.setValue('length', dimensions.length);
            if (dimensions.width) form.setValue('width', dimensions.width);
            if (dimensions.height) form.setValue('height', dimensions.height);
            if (dimensions.weight) form.setValue('weight', dimensions.weight);
            
            setLastUpdate(new Date().toLocaleTimeString());
            toast.success('Package dimensions updated automatically from Qboid');
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up Qboid real-time listener');
      supabase.removeChannel(channel);
    };
  }, [orderId, form]);

  // Don't render if no order ID
  if (!orderId) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={fetchLatestDimensions}
        disabled={isRefreshing}
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Syncing...' : 'Sync Qboid'}
      </Button>
      
      {lastUpdate && (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          <span>Updated {lastUpdate}</span>
        </div>
      )}
    </div>
  );
};
