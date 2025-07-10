import { LabelService } from "@/services/easypost/labelService";
import { ShipmentService } from "@/services/easypost/shipmentService";
import { OrderWithRates, ShippingResult } from "@/types/bulkShipping";
import { toast } from "sonner";

export class BulkShippingService {
  private labelService: LabelService;
  private shipmentService: ShipmentService;

  constructor() {
    this.labelService = new LabelService(''); // Will use edge functions
    this.shipmentService = new ShipmentService(''); // Will use edge functions
  }

  async processOrdersForShipping(orders: OrderWithRates[]): Promise<ShippingResult[]> {
    console.log('Starting bulk shipping for orders:', orders.map(o => o.id));
    
    const results: ShippingResult[] = [];

    // Process orders one at a time to avoid rate limiting
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      try {
        console.log(`Processing order ${order.id} (${i + 1}/${orders.length})...`);
        
        // Since we already have rates from the fetch rates step, we don't need to create a new shipment
        // We need to use the existing shipment ID and selected rate
        const selectedRate = order.rates?.find(r => r.id === order.selectedRateId);
        
        if (!selectedRate) {
          throw new Error('No rate selected for order');
        }

        // The rates we have should include the shipment ID from when they were fetched
        // If not, we need to create a new shipment
        let shipmentId = selectedRate.shipment_id || null;
        
        if (!shipmentId) {
          console.log(`Creating new shipment for order ${order.id} as no shipment ID found in rate`);
          shipmentId = await this.createShipmentForOrder(order, selectedRate);
        }

        // Purchase label with error handling
        try {
          const labelResponse = await this.labelService.purchaseLabel(
            shipmentId,
            selectedRate.id,
            order.id
          );

          console.log(`Label purchased for order ${order.id}:`, labelResponse.tracking_code);

          results.push({
            orderId: order.id,
            success: true,
            trackingNumber: labelResponse.tracking_code,
            labelUrl: labelResponse.postage_label?.label_url,
            cost: parseFloat(selectedRate.rate)
          });
        } catch (labelError: any) {
          // Handle rate limiting on label purchase
          if (labelError.message?.includes('rate-limited') || labelError.message?.includes('RATE_LIMITED')) {
            toast.error('API rate limit reached during label purchase. Please wait a few minutes before trying again.');
            results.push({
              orderId: order.id,
              success: false,
              error: 'Rate limited during label purchase - please try again later'
            });
            break;
          }
          throw labelError;
        }

        // Add delay between orders to prevent rate limiting (1 second)
        if (i < orders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        results.push({
          orderId: order.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // If we encounter errors, add a delay before the next order
        if (i < orders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    this.reportResults(results);
    return results;
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