import { ShipmentService } from "@/services/easypost/shipmentService";
import { OrderForShipping, OrderWithRates } from "@/types/bulkShipping";

export class RateService {
  private shipmentService: ShipmentService;

  constructor() {
    this.shipmentService = new ShipmentService(''); // Will use edge functions
  }

  async fetchRatesForOrders(orders: OrderForShipping[]): Promise<OrderWithRates[]> {
    console.log('Fetching rates for orders:', orders.map(o => o.id));
    
    const ordersWithRates: OrderWithRates[] = [];

    // Process orders one at a time to get rates
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      try {
        console.log(`Fetching rates for order ${order.id} (${i + 1}/${orders.length})...`);
        
        // Create shipment data
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
            weight: Math.max(1, order.items.reduce((total, item) => {
              const itemWeight = parseFloat(item.weight?.toString() || '0');
              const quantity = parseInt(item.quantity?.toString() || '1');
              return total + (itemWeight * quantity);
            }, 0))
          },
          options: {
            label_format: 'PDF'
          }
        };

        // Create shipment to get rates
        const shipmentResponse = await this.shipmentService.createShipment(shipmentData);
        console.log(`Rates fetched for order ${order.id}:`, shipmentResponse.id);

        // Process standard rates only
        const rates = shipmentResponse.rates || [];
        const processedRates = rates.map(rate => ({
          id: rate.id,
          carrier: rate.carrier || 'Unknown',
          service: rate.service || 'Standard',
          rate: rate.rate || '0.00',
          delivery_days: rate.delivery_days,
          shipment_id: shipmentResponse.id // Store the shipment ID with each rate
        }));

        ordersWithRates.push({
          ...order,
          rates: processedRates
        });

        // Add delay between requests to prevent rate limiting
        if (i < orders.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`Error fetching rates for order ${order.id}:`, error);
        // Add order with empty rates on error
        ordersWithRates.push({
          ...order,
          rates: []
        });
      }
    }

    return ordersWithRates;
  }
}