
import { useState, useEffect } from "react";
import { fetchOrders } from "@/services/orderService";
import { useCartonization } from "@/hooks/useCartonization";
import { CartonizationEngine } from "@/services/cartonization/cartonizationEngine";
import { Box } from "@/services/cartonization/cartonizationEngine";
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

  const handleBulkShip = async (orders: OrderForShipping[]) => {
    console.log('Bulk shipping orders:', orders);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real application, you would:
    // 1. Create shipments for each order using your shipping service
    // 2. Purchase shipping labels
    // 3. Update order statuses
    // 4. Return the shipping results with label URLs
    
    // Mock successful shipping result
    const shippingResults = orders.map(order => ({
      orderId: order.id,
      success: true,
      trackingNumber: `1Z${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      labelUrl: `https://example.com/label/${order.id}.pdf`, // This would be the actual label URL
      cost: 8.50 + Math.random() * 5 // Mock shipping cost
    }));
    
    toast.success(`Bulk shipping initiated for ${orders.length} orders`);
    return shippingResults;
  };

  return {
    boxShippingGroups,
    loading,
    handleBulkShip
  };
};
