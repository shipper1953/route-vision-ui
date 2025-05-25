
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFormContext } from 'react-hook-form';
import { ShipmentForm } from '@/types/shipment';

interface QboidDimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
  orderId?: string;
}

export const useQboidConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastScan, setLastScan] = useState<QboidDimensions | null>(null);
  const form = useFormContext<ShipmentForm>();

  const handleQboidData = useCallback(async (dimensions: QboidDimensions) => {
    console.log('Received Qboid dimensions:', dimensions);
    
    // Update form with dimensions
    form.setValue('length', dimensions.length);
    form.setValue('width', dimensions.width);
    form.setValue('height', dimensions.height);
    form.setValue('weight', dimensions.weight);
    
    // If we have an order ID, look up the order and populate the form
    if (dimensions.orderId) {
      try {
        console.log('Looking up order:', dimensions.orderId);
        
        // Get order data from localStorage first (faster)
        const ordersData = localStorage.getItem('orders');
        let order = null;
        
        if (ordersData) {
          const orders = JSON.parse(ordersData);
          order = orders.find((o: any) => o.id === dimensions.orderId);
        }
        
        // If not found in localStorage, try Supabase
        if (!order) {
          const { data: supabaseOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', dimensions.orderId)
            .single();
          
          order = supabaseOrder;
        }
        
        if (order) {
          console.log('Found order:', order);
          
          // Populate shipping address
          if (order.shippingAddress || order.shipping_address) {
            const addr = order.shippingAddress || order.shipping_address;
            form.setValue('toName', order.customerName || order.customer_name || '');
            form.setValue('toCompany', order.customerCompany || order.customer_company || '');
            form.setValue('toPhone', order.customerPhone || order.customer_phone || '');
            form.setValue('toEmail', order.customerEmail || order.customer_email || '');
            form.setValue('toStreet1', addr.street1 || '');
            form.setValue('toStreet2', addr.street2 || '');
            form.setValue('toCity', addr.city || '');
            form.setValue('toState', addr.state || '');
            form.setValue('toZip', addr.zip || '');
            form.setValue('toCountry', addr.country || 'US');
          }
          
          // CRITICAL FIX: Set the required delivery date from the order
          if (order.requiredDeliveryDate || order.required_delivery_date) {
            const deliveryDate = order.requiredDeliveryDate || order.required_delivery_date;
            console.log('Setting required delivery date from order:', deliveryDate);
            form.setValue('requiredDeliveryDate', deliveryDate);
          }
          
          toast.success(`Order ${dimensions.orderId} details loaded from Qboid scan`);
        } else {
          console.warn('Order not found:', dimensions.orderId);
          toast.warning(`Order ${dimensions.orderId} not found. Dimensions loaded.`);
        }
      } catch (error) {
        console.error('Error looking up order:', error);
        toast.error('Failed to load order details, but dimensions were set');
      }
    }
    
    setLastScan(dimensions);
    toast.success('Package dimensions updated from Qboid scanner');
  }, [form]);

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
            setIsConnected(true);
          }
        }
      )
      .subscribe((status) => {
        console.log('Qboid subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up Qboid subscription');
      channel.unsubscribe();
    };
  }, [handleQboidData]);

  return {
    isConnected,
    lastScan,
    handleQboidData
  };
};
