import { LabelService } from "@/services/easypost/labelService";
import { ShipmentService } from "@/services/easypost/shipmentService";
import { OrderWithRates, ShippingResult } from "@/types/bulkShipping";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export class BulkShippingService {
  private labelService: LabelService;
  private shipmentService: ShipmentService;

  constructor() {
    this.labelService = new LabelService(''); // Will use edge functions
    this.shipmentService = new ShipmentService(''); // Will use edge functions
  }

  async processOrdersForShipping(orders: OrderWithRates[]): Promise<ShippingResult[]> {
    console.log(`Starting bulk label purchase for ${orders.length} orders`);
    
    // OPTIMIZATION: Batch fetch all shipping addresses upfront
    const orderIds = orders.map(o => o.id);
    const addressMap = await this.batchFetchShippingAddresses(orderIds);
    console.log(`✅ Pre-fetched ${addressMap.size} shipping addresses`);
    
    const results: ShippingResult[] = [];
    const CONCURRENCY_LIMIT = 3;
    let rateLimitHit = false;
    let backoffMs = 0;

    // OPTIMIZATION: Process with limited concurrency
    for (let i = 0; i < orders.length; i += CONCURRENCY_LIMIT) {
      if (rateLimitHit) break;
      
      const batch = orders.slice(i, i + CONCURRENCY_LIMIT);
      console.log(`Processing label batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(orders.length / CONCURRENCY_LIMIT)}: ${batch.length} orders`);
      
      const batchPromises = batch.map(async (order) => {
        // Since we already have rates from the fetch rates step, we don't need to create a new shipment
        // We need to use the existing shipment ID and selected rate
        const selectedRate = order.rates?.find(r => r.id === order.selectedRateId);
        
        if (!selectedRate) {
          return {
            orderId: order.id,
            success: false,
            error: 'No rate selected for order'
          };
        }

        // The rates we have should include the shipment ID from when they were fetched
        // If not, we need to create a new shipment
        let shipmentId = selectedRate.shipment_id || null;
        
        if (!shipmentId) {
          console.log(`Creating new shipment for order ${order.id} as no shipment ID found in rate`);
          try {
            shipmentId = await this.createShipmentForOrder(order, selectedRate);
          } catch (error: any) {
            return {
              orderId: order.id,
              success: false,
              error: error.message || 'Failed to create shipment'
            };
          }
        }

        // Purchase label with error handling
        try {
          // Prepare box data from the recommended box
          const selectedBoxData = order.recommendedBox ? {
            selectedBoxId: order.recommendedBox.id,
            selectedBoxSku: order.recommendedBox.sku || order.recommendedBox.name,
            selectedBoxName: order.recommendedBox.name
          } : undefined;

          // For bulk shipping, include all items from the order
          const selectedItems = order.items.map(item => ({
            sku: item.sku || item.name,
            name: item.name || item.sku,
            quantity: parseInt(item.quantity?.toString() || '1')
          }));

          console.log(`Purchasing label for order ${order.id}`);
          console.log(`Selected rate for order ${order.id}:`, { 
            carrier: selectedRate.carrier, 
            service: selectedRate.service, 
            rate: selectedRate.rate 
          });

          // Extract both original and marked-up costs
          const originalCost = parseFloat((selectedRate as any).original_rate || selectedRate.rate);
          const markedUpCost = parseFloat(selectedRate.rate);

          const labelResponse = await this.labelService.purchaseLabel(
            shipmentId,
            selectedRate.id,
            order.id,
            undefined, // provider - let it default
            selectedBoxData,
            selectedItems, // Pass items for partial fulfillment tracking
            originalCost,
            markedUpCost
          );

          console.log(`✅ Label purchased for order ${order.id}:`, labelResponse.tracking_code);

          return {
            orderId: order.id,
            success: true,
            trackingNumber: labelResponse.tracking_code,
            labelUrl: labelResponse.postage_label?.label_url,
            cost: parseFloat(selectedRate.rate)
          };

        } catch (error: any) {
          console.error(`Error processing order ${order.id}:`, error);
          
          // Check for rate limiting
          const isRateLimited = error.message?.includes('rate-limited') || 
                                 error.message?.includes('RATE_LIMITED') ||
                                 error.message?.includes('429');
          
          if (isRateLimited) {
            rateLimitHit = true;
          }
          
          return {
            orderId: order.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      // Process batch concurrently
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }

      // OPTIMIZATION: Exponential backoff only on rate limiting
      if (rateLimitHit) {
        backoffMs = backoffMs === 0 ? 2000 : Math.min(backoffMs * 2, 30000);
        console.warn(`⚠️ Rate limit detected - backing off for ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    this.reportResults(results);
    return results;
  }

  private async batchFetchShippingAddresses(orderIds: string[]): Promise<Map<string, any>> {
    const addressMap = new Map<string, any>();
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_id, shipping_address')
        .in('order_id', orderIds);

      if (error) {
        console.error('Error batch fetching shipping addresses:', error);
        return addressMap;
      }

      if (data) {
        data.forEach(order => {
          addressMap.set(order.order_id, order.shipping_address);
        });
      }
    } catch (error) {
      console.error('Failed to batch fetch shipping addresses:', error);
    }
    
    return addressMap;
  }

  private async createShipmentForOrder(order: OrderWithRates, selectedRate: any): Promise<string> {
    const shipmentData = {
      to_address: {
        name: order.customerName,
        street1: order.shippingAddress?.street1 || order.shippingAddress?.address1 || '',
        street2: order.shippingAddress?.street2 || order.shippingAddress?.address2 || '',
        city: order.shippingAddress?.city || '',
        state: order.shippingAddress?.state || '',
        zip: order.shippingAddress?.zip || order.shippingAddress?.zipCode || '',
        country: order.shippingAddress?.country || 'US',
        phone: order.shippingAddress?.phone || '5555555555' // Default phone if missing
      },
      from_address: {
        name: 'Ship Tornado',
        company: 'Ship Tornado',
        street1: '123 Warehouse St',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'US',
        phone: '5555550123' // Fixed: 10 digit phone number
      },
      parcel: {
        length: order.recommendedBox.length,
        width: order.recommendedBox.width,
        height: order.recommendedBox.height,
        weight: Math.max(1, (() => {
          // Calculate total weight including items and box weight
          const itemsWeight = order.items.reduce((total, item) => {
            const itemWeight = parseFloat(item.weight?.toString() || '0');
            const quantity = parseInt(item.quantity?.toString() || '1');
            return total + (itemWeight * quantity);
          }, 0);
          
          // Use packageWeight if available, otherwise calculate
          if (order.packageWeight) {
            return order.packageWeight.totalWeight;
          }
          
          // Estimate box weight (0.1 lbs per $1 of cost as fallback)
          const boxWeight = order.recommendedBox.cost * 0.1;
          return itemsWeight + boxWeight;
        })())
      },
      options: {
        label_format: 'PDF'
      }
    };

    // Create shipment with error handling
    try {
      const shipmentResponse = await this.shipmentService.createShipment(shipmentData);
      console.log(`Shipment created for order ${order.id}:`, shipmentResponse.id);
      
      // Find the matching rate in the new shipment response
      const allRates = shipmentResponse.rates || [];
      const matchingRate = allRates.find(rate => 
        rate.carrier === selectedRate.carrier && 
        rate.service === selectedRate.service
      ) || allRates[0]; // Fallback to first available rate
      
      if (matchingRate) {
        selectedRate.id = matchingRate.id; // Update the rate ID to match the new shipment
      }

      return shipmentResponse.id;
    } catch (error: any) {
      // Check if it's a rate limiting error
      if (error.message?.includes('rate-limited') || error.message?.includes('RATE_LIMITED')) {
        toast.error('API rate limit reached. Please wait a few minutes before trying again.');
        throw new Error('Rate limited - please try again later');
      }
      throw error;
    }
  }

  private async updateOrderWithShipmentInfo(orderId: string, shipmentInfo: {
    carrier: string;
    service: string;
    trackingNumber: string;
    trackingUrl?: string;
    labelUrl?: string;
    cost: number;
    easypostShipmentId: string;
  }): Promise<void> {
    try {
      console.log(`Updating order ${orderId} with shipment info:`, shipmentInfo);
      
      // Fetch current shipping address
      const { data: orderData } = await supabase
        .from('orders')
        .select('shipping_address')
        .eq('order_id', orderId)
        .maybeSingle();
      
      const currentAddress = (orderData?.shipping_address || {}) as Record<string, any>;
      
      // Update the order status and shipping details
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          shipping_address: {
            ...currentAddress,
            carrier: shipmentInfo.carrier,
            service: shipmentInfo.service,
            trackingNumber: shipmentInfo.trackingNumber,
            trackingUrl: shipmentInfo.trackingUrl,
            labelUrl: shipmentInfo.labelUrl,
            cost: shipmentInfo.cost,
            easypostShipmentId: shipmentInfo.easypostShipmentId
          }
        })
        .eq('order_id', orderId);

      if (error) {
        console.error(`Error updating order ${orderId}:`, error);
        throw error;
      }

      console.log(`✅ Successfully updated order ${orderId} with shipment information`);
    } catch (error) {
      console.error(`Failed to update order ${orderId} with shipment info:`, error);
      // Don't throw the error to avoid failing the entire bulk process
    }
  }


  private reportResults(results: ShippingResult[]): void {
    const successfulShipments = results.filter(r => r.success);
    const failedShipments = results.filter(r => !r.success);

    if (successfulShipments.length > 0) {
      toast.success(`Successfully shipped ${successfulShipments.length} orders`);
    }
    
    if (failedShipments.length > 0) {
      const rateLimitedCount = failedShipments.filter(r => r.error?.includes('rate limit')).length;
      if (rateLimitedCount > 0) {
        toast.error(`${rateLimitedCount} orders failed due to rate limiting. Please wait and try again.`);
      } else {
        toast.error(`Failed to ship ${failedShipments.length} orders`);
      }
    }
  }
}