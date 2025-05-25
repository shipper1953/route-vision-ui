
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QboidDimensions } from './types';

interface UseQboidDataLookupProps {
  handleQboidData: (dimensions: QboidDimensions) => Promise<void>;
}

export const useQboidDataLookup = ({ handleQboidData }: UseQboidDataLookupProps) => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkExistingQboidData = async () => {
      const urlOrderId = searchParams.get('orderId');
      if (!urlOrderId) return;

      console.log('Checking for existing Qboid data for order:', urlOrderId);
      
      try {
        // First check the orders table for qboid_dimensions
        const { data: orderData } = await supabase
          .from('orders')
          .select('qboid_dimensions')
          .eq('order_id', urlOrderId)
          .single();

        if (orderData?.qboid_dimensions) {
          console.log('Found Qboid dimensions in order:', orderData.qboid_dimensions);
          
          const dimensions: QboidDimensions = {
            length: orderData.qboid_dimensions.length || 0,
            width: orderData.qboid_dimensions.width || 0,
            height: orderData.qboid_dimensions.height || 0,
            weight: orderData.qboid_dimensions.weight || 0,
            orderId: urlOrderId
          };
          
          await handleQboidData(dimensions);
          return;
        }

        // Also check qboid_events table for recent events
        const { data: qboidData } = await supabase
          .from('qboid_events')
          .select('*')
          .eq('event_type', 'dimensions_received')
          .order('created_at', { ascending: false })
          .limit(10);

        if (qboidData && qboidData.length > 0) {
          // Find matching data by order ID
          for (const event of qboidData) {
            const eventData = event.data as any;
            if (eventData && (eventData.orderId === urlOrderId || eventData.barcode === urlOrderId)) {
              console.log('Found existing Qboid data for current order:', eventData);
              
              const dimensions: QboidDimensions = {
                length: eventData.dimensions?.length || eventData.length || 0,
                width: eventData.dimensions?.width || eventData.width || 0,
                height: eventData.dimensions?.height || eventData.height || 0,
                weight: eventData.dimensions?.weight || eventData.weight || 0,
                orderId: eventData.orderId || eventData.barcode
              };
              
              await handleQboidData(dimensions);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error checking existing Qboid data:', error);
      }
    };

    checkExistingQboidData();
  }, [searchParams, handleQboidData]);
};
