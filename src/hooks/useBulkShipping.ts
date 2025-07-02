
import { useState, useEffect } from "react";
import { fetchOrders } from "@/services/orderService";
import { useCartonization } from "@/hooks/useCartonization";
import { CartonizationEngine } from "@/services/cartonization/cartonizationEngine";
import { Box } from "@/services/cartonization/cartonizationEngine";
import { ShipmentService } from "@/services/easypost/shipmentService";
import { LabelService } from "@/services/easypost/labelService";
import { toast } from "sonner";

interface OrderForShipping {
  id: string;
  customerName: string;
  items: any[];
  value: number;
  shippingAddress: any;
  recommendedBox: Box;
  recommendedService?: string;
}

interface BoxShippingGroup {
  box: Box;
  orders: OrderForShipping[];
}

interface ShippingResult {
  orderId: string;
  success: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  cost?: number;
  error?: string;
}

interface OrderWithRates extends OrderForShipping {
  rates: Array<{
    id: string;
    carrier: string;
    service: string;
    rate: string;
    delivery_days?: number;
    shipment_id?: string;
  }>;
  selectedRateId?: string;
}

export const useBulkShipping = () => {
  const [boxShippingGroups, setBoxShippingGroups] = useState<BoxShippingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { boxes, createItemsFromOrderData } = useCartonization();

  useEffect(() => {
    const loadShippingGroups = async () => {
      try {
        setLoading(true);
        const orders = await fetchOrders();
        
        // Filter for orders that are ready to ship
        const readyToShipOrders = orders.filter(order => 
          order.status === 'ready_to_ship' || order.status === 'processing'
        );

        // Group orders by recommended box
        const boxGroups = new Map<string, BoxShippingGroup>();

        for (const order of readyToShipOrders) {
          console.log(`Processing order ${order.id} for cartonization:`, order);
          
          // Only process orders with items
          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            console.log(`Order ${order.id} has ${order.items.length} items:`, order.items);
            const items = createItemsFromOrderData(order.items, []);
            console.log(`Created cartonization items for order ${order.id}:`, items);
            
            if (items.length > 0) {
              const engine = new CartonizationEngine(boxes);
              console.log(`Running cartonization for order ${order.id} with ${boxes.length} available boxes`);
              const result = engine.calculateOptimalBox(items);
              console.log(`Cartonization result for order ${order.id}:`, result);
              
              if (result && result.recommendedBox) {
                console.log(`✅ Found recommended box for order ${order.id}:`, result.recommendedBox.name);
                const boxId = result.recommendedBox.id;
                
                if (!boxGroups.has(boxId)) {
                  boxGroups.set(boxId, {
                    box: result.recommendedBox,
                    orders: []
                  });
                }
                
                // Convert order value to number for comparison
                const orderValue = parseFloat(order.value.toString()) || 0;
                
                // Determine recommended shipping service based on order value and delivery requirements
                let recommendedService = 'Ground';
                if (orderValue > 500) {
                  recommendedService = 'Priority';
                } else if (order.requiredDeliveryDate) {
                  const daysUntilRequired = Math.ceil(
                    (new Date(order.requiredDeliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  if (daysUntilRequired <= 1) {
                    recommendedService = 'Next Day';
                  } else if (daysUntilRequired <= 2) {
                    recommendedService = '2-Day';
                  } else if (daysUntilRequired <= 3) {
                    recommendedService = 'Priority';
                  }
                }

                const orderForShipping: OrderForShipping = {
                  id: order.id,
                  customerName: order.customerName,
                  items: order.items,
                  value: orderValue,
                  shippingAddress: order.shippingAddress,
                  recommendedBox: result.recommendedBox,
                  recommendedService
                };

                boxGroups.get(boxId)!.orders.push(orderForShipping);
              } else {
                console.warn(`❌ No recommended box found for order ${order.id}. Cartonization failed.`);
                console.warn(`Order details:`, { 
                  orderId: order.id, 
                  itemsCount: items.length, 
                  boxesAvailable: boxes.length,
                  totalWeight: items.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
                  totalVolume: items.reduce((sum, item) => sum + (item.length * item.width * item.height * item.quantity), 0)
                });
              }
            } else {
              console.warn(`❌ No cartonization items created for order ${order.id}`);
            }
          } else {
            console.warn(`❌ Order ${order.id} has no items or items is not an array:`, order.items);
          }
        }

        // Convert to array and sort by number of orders (descending)
        const sortedGroups = Array.from(boxGroups.values()).sort(
          (a, b) => b.orders.length - a.orders.length
        );

        setBoxShippingGroups(sortedGroups);
      } catch (error) {
        console.error('Error loading bulk shipping data:', error);
        toast.error('Failed to load shipping data');
        setBoxShippingGroups([]);
      } finally {
        setLoading(false);
      }
    };

    loadShippingGroups();
  }, [boxes]);

  const handleFetchRates = async (orders: OrderForShipping[]): Promise<OrderWithRates[]> => {
    console.log('Fetching rates for orders:', orders.map(o => o.id));
    
    const shipmentService = new ShipmentService(''); // Will use edge functions
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
            phone: order.shippingAddress?.phone || ''
          },
          from_address: {
            name: 'Ship Tornado',
            company: 'Ship Tornado',
            street1: '123 Warehouse St',
            city: 'Austin',
            state: 'TX',
            zip: '78701',
            country: 'US',
            phone: '555-0123'
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
        const shipmentResponse = await shipmentService.createShipment(shipmentData);
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
  };

  const handleBulkShip = async (orders: OrderWithRates[]): Promise<ShippingResult[]> => {
    console.log('Starting bulk shipping for orders:', orders.map(o => o.id));
    
    const labelService = new LabelService(''); // Will use edge functions
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
          
          // Need to create shipment if we don't have shipment ID
          const shipmentService = new ShipmentService(''); // Will use edge functions
          
          const shipmentData = {
            to_address: {
              name: order.customerName,
              street1: order.shippingAddress?.street1 || order.shippingAddress?.address1 || '',
              street2: order.shippingAddress?.street2 || order.shippingAddress?.address2 || '',
              city: order.shippingAddress?.city || '',
              state: order.shippingAddress?.state || '',
              zip: order.shippingAddress?.zip || order.shippingAddress?.zipCode || '',
              country: order.shippingAddress?.country || 'US',
              phone: order.shippingAddress?.phone || ''
            },
            from_address: {
              name: 'Ship Tornado',
              company: 'Ship Tornado',
              street1: '123 Warehouse St',
              city: 'Austin',
              state: 'TX',
              zip: '78701',
              country: 'US',
              phone: '555-0123'
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

          // Create shipment with error handling
          try {
            const shipmentResponse = await shipmentService.createShipment(shipmentData);
            console.log(`Shipment created for order ${order.id}:`, shipmentResponse.id);
            shipmentId = shipmentResponse.id;
            
            // Find the matching rate in the new shipment response
            const allRates = shipmentResponse.rates || [];
            const matchingRate = allRates.find(rate => 
              rate.carrier === selectedRate.carrier && 
              rate.service === selectedRate.service
            ) || allRates[0]; // Fallback to first available rate
            
            if (matchingRate) {
              selectedRate.id = matchingRate.id; // Update the rate ID to match the new shipment
            }
          } catch (error: any) {
            // Check if it's a rate limiting error
            if (error.message?.includes('rate-limited') || error.message?.includes('RATE_LIMITED')) {
              toast.error('API rate limit reached. Please wait a few minutes before trying again.');
              results.push({
                orderId: order.id,
                success: false,
                error: 'Rate limited - please try again later'
              });
              // Stop processing remaining orders to avoid further rate limiting
              break;
            }
            throw error;
          }
        }

        // Purchase label with error handling
        try {
          const labelResponse = await labelService.purchaseLabel(
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

    return results;
  };

  return {
    boxShippingGroups,
    loading,
    handleFetchRates,
    handleBulkShip
  };
};
