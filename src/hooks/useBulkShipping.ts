import { useState, useEffect, useCallback, useMemo } from "react";
import { useCartonization } from "@/hooks/useCartonization";
import { toast } from "sonner";
import { OrderProcessor } from "@/services/bulkShipping/orderProcessor";
import { RateService } from "@/services/bulkShipping/rateService";
import { BulkShippingService } from "@/services/bulkShipping/shippingService";
import { BoxShippingGroup, OrderForShipping, OrderWithRates, ShippingResult } from "@/types/bulkShipping";

export const useBulkShipping = () => {
  const [boxShippingGroups, setBoxShippingGroups] = useState<BoxShippingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { boxes, createItemsFromOrderData } = useCartonization();

  // Memoize the order processor to prevent infinite re-renders
  const orderProcessor = useMemo(() => 
    new OrderProcessor(boxes, createItemsFromOrderData), 
    [boxes, createItemsFromOrderData]
  );

  useEffect(() => {
    const loadShippingGroups = async () => {
      try {
        setLoading(true);
        const groups = await orderProcessor.processOrdersForShipping();
        setBoxShippingGroups(groups);
      } catch (error) {
        console.error('Error loading bulk shipping data:', error);
        toast.error('Failed to load shipping data');
        setBoxShippingGroups([]);
      } finally {
        setLoading(false);
      }
    };

    // Only run if we have boxes to prevent unnecessary calls
    if (boxes.length > 0) {
      loadShippingGroups();
    } else {
      setLoading(false);
      setBoxShippingGroups([]);
    }
  }, [orderProcessor, boxes.length]); // Use orderProcessor and boxes.length instead of individual deps

  const handleFetchRates = useCallback(async (orders: OrderForShipping[]): Promise<OrderWithRates[]> => {
    const rateService = new RateService();
    return await rateService.fetchRatesForOrders(orders);
  }, []);

  const handleBulkShip = useCallback(async (orders: OrderWithRates[]): Promise<ShippingResult[]> => {
    const shippingService = new BulkShippingService();
    return await shippingService.processOrdersForShipping(orders);
  }, []);

  const refreshShippingGroups = useCallback(async () => {
    try {
      setLoading(true);
      const groups = await orderProcessor.processOrdersForShipping();
      setBoxShippingGroups(groups);
    } catch (error) {
      console.error('Error refreshing shipping data:', error);
      toast.error('Failed to refresh shipping data');
      setBoxShippingGroups([]);
    } finally {
      setLoading(false);
    }
  }, [orderProcessor]);

  return {
    boxShippingGroups,
    loading,
    handleFetchRates,
    handleBulkShip,
    refreshShippingGroups
  };
};