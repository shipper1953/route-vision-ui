import { fetchOrders } from "@/services/orderService";
import { CartonizationEngine, Box } from "@/services/cartonization/cartonizationEngine";
import { OrderForShipping, BoxShippingGroup } from "@/types/bulkShipping";

export class OrderProcessor {
  constructor(private boxes: Box[], private createItemsFromOrderData: Function) {}

  async processOrdersForShipping(): Promise<BoxShippingGroup[]> {
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
        const items = this.createItemsFromOrderData(order.items, []);
        console.log(`Created cartonization items for order ${order.id}:`, items);
        
        if (items.length > 0) {
          const engine = new CartonizationEngine(this.boxes, {
            fillRateThreshold: 45,
            maxPackageWeight: 50,
            dimensionalWeightFactor: 139,
            packingEfficiency: 85,
            allowPartialFill: true,
            optimizeForCost: true, // Enable cost optimization for bulk shipping
            optimizeForSpace: true
          });
          console.log(`Running enhanced cartonization for order ${order.id} with ${this.boxes.length} available boxes`);
          const result = engine.calculateOptimalBox(items);
          console.log(`Enhanced cartonization result for order ${order.id}:`, result);
          
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
              recommendedService,
              requiredDeliveryDate: order.requiredDeliveryDate
            };

            boxGroups.get(boxId)!.orders.push(orderForShipping);
          } else {
            console.warn(`❌ No recommended box found for order ${order.id}. Cartonization failed.`);
            console.warn(`Order details:`, { 
              orderId: order.id, 
              itemsCount: items.length, 
              boxesAvailable: this.boxes.length,
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
    return Array.from(boxGroups.values()).sort(
      (a, b) => b.orders.length - a.orders.length
    );
  }
}