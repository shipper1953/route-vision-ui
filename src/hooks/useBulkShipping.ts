
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
          // Only process orders with items
          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            const items = createItemsFromOrderData(order.items, []);
            
            if (items.length > 0) {
              const engine = new CartonizationEngine(boxes);
              const result = engine.calculateOptimalBox(items);
              
              if (result && result.recommendedBox) {
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
              }
            }
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

  const handleBulkShip = async (orders: OrderForShipping[]): Promise<ShippingResult[]> => {
    console.log('Starting bulk shipping for orders:', orders.map(o => o.id));
    
    const shipmentService = new ShipmentService(''); // Will use edge functions
    const labelService = new LabelService(''); // Will use edge functions
    const results: ShippingResult[] = [];

    for (const order of orders) {
      try {
        console.log(`Processing order ${order.id}...`);
        
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

        // Create shipment
        const shipmentResponse = await shipmentService.createShipment(shipmentData);
        console.log(`Shipment created for order ${order.id}:`, shipmentResponse.id);

        // Find best rate based on recommended service
        let selectedRate = null;
        const allRates = [...(shipmentResponse.rates || []), ...(shipmentResponse.smartRates || [])];
        
        if (allRates.length > 0) {
          // Try to find rate matching recommended service
          selectedRate = allRates.find(rate => 
            rate.service?.toLowerCase().includes(order.recommendedService?.toLowerCase() || 'ground')
          );
          
          // If no matching service, use cheapest rate
          if (!selectedRate) {
            selectedRate = allRates.reduce((cheapest, rate) => 
              parseFloat(rate.rate) < parseFloat(cheapest.rate) ? rate : cheapest
            );
          }
        }

        if (!selectedRate) {
          throw new Error('No shipping rates available');
        }

        // Purchase label
        const labelResponse = await labelService.purchaseLabel(
          shipmentResponse.id,
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

      } catch (error) {
        console.error(`Error processing order ${order.id}:`, error);
        results.push({
          orderId: order.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulShipments = results.filter(r => r.success);
    const failedShipments = results.filter(r => !r.success);

    if (successfulShipments.length > 0) {
      toast.success(`Successfully shipped ${successfulShipments.length} orders`);
    }
    
    if (failedShipments.length > 0) {
      toast.error(`Failed to ship ${failedShipments.length} orders`);
    }

    return results;
  };

  return {
    boxShippingGroups,
    loading,
    handleBulkShip
  };
};
