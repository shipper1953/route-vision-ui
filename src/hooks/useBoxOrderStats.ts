
import { useState, useEffect } from "react";
import { fetchOrders } from "@/services/orderService";
import { useCartonization } from "@/hooks/useCartonization";
import { CartonizationEngine } from "@/services/cartonization/cartonizationEngine";
import { Box } from "@/services/cartonization/cartonizationEngine";

interface BoxOrderStats extends Box {
  recommendedOrderCount: number;
  recommendedOrders: string[];
}

export const useBoxOrderStats = () => {
  const [boxStats, setBoxStats] = useState<BoxOrderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { boxes, createItemsFromOrderData } = useCartonization();

  useEffect(() => {
    const calculateBoxStats = async () => {
      try {
        setLoading(true);
        const orders = await fetchOrders();
        
        // Filter for open orders that need to ship
        const openOrders = orders.filter(order => 
          order.status === 'ready_to_ship' || order.status === 'processing'
        );

        // Initialize stats for each box
        const statsMap = new Map<string, BoxOrderStats>();
        boxes.forEach(box => {
          statsMap.set(box.id, {
            ...box,
            recommendedOrderCount: 0,
            recommendedOrders: []
          });
        });

        // Calculate recommendations for each open order
        for (const order of openOrders) {
          if (order.items && order.items.length > 0) {
            // Create items from order data (using empty master items array for now)
            const items = createItemsFromOrderData(order.items, []);
            
            if (items.length > 0) {
              const engine = new CartonizationEngine(boxes);
              const result = engine.calculateOptimalBox(items);
              
              if (result && result.recommendedBox) {
                const boxId = result.recommendedBox.id;
                const currentStats = statsMap.get(boxId);
                if (currentStats) {
                  currentStats.recommendedOrderCount += 1;
                  currentStats.recommendedOrders.push(order.id);
                }
              }
            }
          }
        }

        // Convert to array and sort by recommendation count (descending)
        const sortedStats = Array.from(statsMap.values()).sort(
          (a, b) => b.recommendedOrderCount - a.recommendedOrderCount
        );

        setBoxStats(sortedStats);
      } catch (error) {
        console.error('Error calculating box order stats:', error);
        // Fallback to basic box data
        setBoxStats(boxes.map(box => ({
          ...box,
          recommendedOrderCount: 0,
          recommendedOrders: []
        })));
      } finally {
        setLoading(false);
      }
    };

    calculateBoxStats();
  }, [boxes, createItemsFromOrderData]);

  return { boxStats, loading };
};
