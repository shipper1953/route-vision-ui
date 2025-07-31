import { supabase } from "@/integrations/supabase/client";
import { OrderForShipping, BoxShippingGroup } from "@/types/bulkShipping";
import { Box } from "@/services/cartonization/types";

export class OrderProcessor {
  constructor(private boxes: Box[]) {}

  async processOrdersForShipping(): Promise<BoxShippingGroup[]> {
    try {
      // Get orders with stored cartonization data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_cartonization (
            recommended_box_id,
            recommended_box_data,
            utilization,
            confidence,
            total_weight,
            items_weight,
            box_weight
          )
        `)
        .eq('status', 'ready_to_ship');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return [];
      }

      if (!orders || orders.length === 0) {
        console.log('No orders with ready_to_ship status found');
        return [];
      }

      console.log(`Found ${orders.length} orders ready to ship`);

      const processedOrders: OrderForShipping[] = [];

      for (const order of orders) {
        try {
          if (!Array.isArray(order.items) || order.items.length === 0) {
            console.log(`Skipping order ${order.id} - no valid items`);
            continue;
          }

          // Check if we have cartonization data
          const cartonization = order.order_cartonization?.[0];
          if (!cartonization || !cartonization.recommended_box_data) {
            console.log(`Skipping order ${order.id} - no cartonization data`);
            continue;
          }

          // Convert order value to number for comparison
          const orderValue = parseFloat(order.value?.toString() || '0');
          
          // Determine recommended shipping service based on order value and delivery requirements
          let recommendedService = 'Ground';
          if (orderValue > 500) {
            recommendedService = 'Priority';
          } else if (order.required_delivery_date) {
            const daysUntilRequired = Math.ceil(
              (new Date(order.required_delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilRequired <= 1) {
              recommendedService = 'Next Day';
            } else if (daysUntilRequired <= 2) {
              recommendedService = '2-Day';
            } else if (daysUntilRequired <= 3) {
              recommendedService = 'Priority';
            }
          }

          const processedOrder: OrderForShipping = {
            id: order.id.toString(),
            customerName: order.customer_name || '',
            items: order.items,
            value: orderValue,
            shippingAddress: order.shipping_address,
            recommendedBox: cartonization.recommended_box_data,
            recommendedService
          };

          processedOrders.push(processedOrder);
        } catch (error) {
          console.error(`Error processing order ${order.id}:`, error);
          continue;
        }
      }

      // Group orders by recommended box
      const boxGroups = new Map<string, OrderForShipping[]>();
      
      for (const order of processedOrders) {
        const boxId = order.recommendedBox.id;
        if (!boxGroups.has(boxId)) {
          boxGroups.set(boxId, []);
        }
        boxGroups.get(boxId)!.push(order);
      }

      // Convert to BoxShippingGroup array
      const result: BoxShippingGroup[] = Array.from(boxGroups.entries()).map(([boxId, orders]) => {
        const box = orders[0].recommendedBox; // All orders in group have same box
        return {
          box,
          orders,
          totalOrders: orders.length,
          totalValue: orders.reduce((sum, order) => sum + order.value, 0)
        };
      });

      console.log(`Processed ${processedOrders.length} orders into ${result.length} box groups`);
      return result;

    } catch (error) {
      console.error('Error in processOrdersForShipping:', error);
      return [];
    }
  }
}