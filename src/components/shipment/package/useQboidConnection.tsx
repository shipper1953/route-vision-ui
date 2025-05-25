import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFormContext } from 'react-hook-form';
import { ShipmentForm } from '@/types/shipment';
import { useSearchParams } from 'react-router-dom';

interface QboidDimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
  orderId?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const useQboidConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastScan, setLastScan] = useState<QboidDimensions | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState(false);
  const [deviceIp, setDeviceIp] = useState('');
  const form = useFormContext<ShipmentForm>();
  const [searchParams] = useSearchParams();

  const configGuide = {
    instructions: [
      "1. Connect your Qboid device to WiFi",
      "2. Navigate to the device's web interface",
      "3. Configure the API endpoint to point to this application",
      "4. Test the connection by placing a package on the device"
    ]
  };

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
          
          // Set order ID in form for reference
          form.setValue('orderId', dimensions.orderId);
          
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
    setLastUpdateTime(new Date().toLocaleTimeString());
    setConnectionStatus('connected');
    toast.success('Package dimensions updated from Qboid scanner');
  }, [form]);

  // Check for existing Qboid data when component mounts, especially if orderId is in URL
  useEffect(() => {
    const checkExistingQboidData = async () => {
      const urlOrderId = searchParams.get('orderId');
      if (!urlOrderId) return;

      console.log('Checking for existing Qboid data for order:', urlOrderId);
      
      try {
        const { data: qboidData } = await supabase
          .from('qboid_events')
          .select('*')
          .eq('event_type', 'dimensions_received')
          .order('created_at', { ascending: false })
          .limit(10);

        if (qboidData && qboidData.length > 0) {
          // Find matching data by order ID
          for (const event of qboidData) {
            const eventData = event.data;
            if (eventData && (eventData.orderId === urlOrderId || eventData.barcode === urlOrderId)) {
              console.log('Found existing Qboid data for current order:', eventData);
              
              // Convert to expected format and populate form
              const dimensions: QboidDimensions = {
                length: eventData.length || 0,
                width: eventData.width || 0,
                height: eventData.height || 0,
                weight: eventData.weight || 0,
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

  const handleDeviceIpChange = useCallback((ip: string) => {
    setDeviceIp(ip);
  }, []);

  const handleConfigureQboid = useCallback(async () => {
    setConfiguring(true);
    setConnectionStatus('connecting');
    
    try {
      // Simulate configuration process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, just set to connecting state - actual connection happens via realtime
      toast.info('Qboid device configured. Waiting for data...');
    } catch (error) {
      console.error('Error configuring Qboid:', error);
      setConnectionStatus('error');
      toast.error('Failed to configure Qboid device');
    } finally {
      setConfiguring(false);
    }
  }, []);

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
  }, [handleQboidData]);

  // For backward compatibility, also expose isConnected
  const isConnected = connectionStatus === 'connected';

  return {
    isConnected,
    connectionStatus,
    lastScan,
    lastUpdateTime,
    configuring,
    deviceIp,
    configGuide,
    handleQboidData,
    handleDeviceIpChange,
    handleConfigureQboid
  };
};
