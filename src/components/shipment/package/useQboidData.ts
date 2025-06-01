
import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShipmentForm } from '@/types/shipment';
import { QboidDimensions } from './types';

export const useQboidData = () => {
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
        let order: Record<string, any> | null = null;
        
        if (ordersData) {
          const orders = JSON.parse(ordersData);
          order = orders.find((o: Record<string, any>) => o.id === dimensions.orderId);
        }
        
        // If not found in localStorage, try Supabase using order_id_link
        if (!order) {
          const { data: supabaseOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id_link', dimensions.orderId)
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
    
    toast.success('Package dimensions updated from Qboid scanner');
  }, [form]);

  return { handleQboidData };
};
