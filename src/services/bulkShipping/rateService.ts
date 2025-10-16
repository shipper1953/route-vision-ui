import { ShipmentService } from "@/services/easypost/shipmentService";
import { OrderForShipping, OrderWithRates } from "@/types/bulkShipping";
import { applyMarkupToRates } from "@/utils/rateMarkupUtils";
import { supabase } from "@/integrations/supabase/client";

export class RateService {
  private shipmentService: ShipmentService;

  constructor() {
    this.shipmentService = new ShipmentService(''); // Will use edge functions
  }

  async fetchRatesForOrders(orders: OrderForShipping[]): Promise<OrderWithRates[]> {
    console.log('Fetching rates for orders:', orders.map(o => o.id));
    
    // Get company info for markup
    const { data: { user } } = await supabase.auth.getUser();
    let company = null;
    
    if (user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
        
      if (userProfile?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userProfile.company_id)
          .single();
        company = companyData;
      }
    }
    
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

        // Process standard rates and smart rates if available
        const rates = shipmentResponse.rates || [];
        const smartRates = shipmentResponse.smartRates || [];
        
        // Apply company markup to all rates
        const markedUpRates = applyMarkupToRates(rates, company);
        const markedUpSmartRates = applyMarkupToRates(smartRates, company);
        
        // Combine both rate types
        const allRates = [
          ...markedUpRates.map(rate => ({
            id: rate.id,
            carrier: rate.carrier || 'Unknown',
            service: rate.service || 'Standard',
            rate: rate.rate || '0.00',
            original_rate: rate.original_rate || rate.rate || '0.00',
            markup_applied: rate.markup_applied || 0,
            delivery_days: rate.delivery_days,
            delivery_date: rate.delivery_date,
            shipment_id: shipmentResponse.id
          })),
          ...markedUpSmartRates.map(rate => ({
            id: rate.id,
            carrier: rate.carrier || 'Unknown',
            service: rate.service || 'Standard',
            rate: rate.rate || '0.00',
            original_rate: rate.original_rate || rate.rate || '0.00',
            markup_applied: rate.markup_applied || 0,
            delivery_days: rate.delivery_days,
            delivery_date: rate.delivery_date,
            shipment_id: shipmentResponse.id
          }))
        ];

        // Auto-select rate that meets required delivery date if specified
        let selectedRateId: string | undefined;
        if (order.requiredDeliveryDate && allRates.length > 0) {
          const requiredDate = new Date(order.requiredDeliveryDate);
          
          // Filter rates that meet the delivery date requirement
          const viableRates = allRates.filter(rate => {
            if (rate.delivery_date) {
              return new Date(rate.delivery_date) <= requiredDate;
            } else if (rate.delivery_days !== undefined) {
              const estimatedDelivery = new Date();
              estimatedDelivery.setDate(estimatedDelivery.getDate() + rate.delivery_days);
              return estimatedDelivery <= requiredDate;
            }
            return false;
          });

          if (viableRates.length > 0) {
            // Select the cheapest rate that meets the deadline
            const cheapestViable = viableRates.sort((a, b) => 
              parseFloat(a.rate) - parseFloat(b.rate)
            )[0];
            selectedRateId = cheapestViable.id;
            console.log(`✅ Auto-selected rate for order ${order.id}: ${cheapestViable.carrier} ${cheapestViable.service} ($${cheapestViable.rate}) - meets delivery by ${order.requiredDeliveryDate}`);
          } else {
            // If no rates meet the deadline, select the fastest available
            const fastest = allRates.sort((a, b) => {
              const aDays = a.delivery_days ?? 999;
              const bDays = b.delivery_days ?? 999;
              return aDays - bDays;
            })[0];
            selectedRateId = fastest.id;
            console.warn(`⚠️ No rates meet delivery deadline for order ${order.id}. Selected fastest: ${fastest.carrier} ${fastest.service}`);
          }
        } else if (allRates.length > 0) {
          // No required delivery date - select cheapest rate
          const cheapest = allRates.sort((a, b) => 
            parseFloat(a.rate) - parseFloat(b.rate)
          )[0];
          selectedRateId = cheapest.id;
          console.log(`Auto-selected cheapest rate for order ${order.id}: ${cheapest.carrier} ${cheapest.service} ($${cheapest.rate})`);
        }

        ordersWithRates.push({
          ...order,
          rates: allRates,
          selectedRateId
        });

        console.log(`Rates fetched for order ${order.id}:`, shipmentResponse.id);

      } catch (error: any) {
        console.error(`Error fetching rates for order ${order.id}:`, error);
        
        // Check for rate limiting and break the loop if detected
        if (error.message?.includes('rate-limited') || error.message?.includes('RATE_LIMITED')) {
          console.error('Rate limit detected, stopping batch processing');
          ordersWithRates.push({
            ...order,
            rates: []
          });
          break; // Stop processing more orders
        }
        
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