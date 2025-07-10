import { useState, useEffect } from "react";
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

  useEffect(() => {
    const loadShippingGroups = async () => {
      try {
        setLoading(true);
        const orderProcessor = new OrderProcessor(boxes, createItemsFromOrderData);
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

    loadShippingGroups();
  }, [boxes, createItemsFromOrderData]);

  const handleFetchRates = async (orders: OrderForShipping[]): Promise<OrderWithRates[]> => {
    const rateService = new RateService();
    return await rateService.fetchRatesForOrders(orders);
  };

  const handleBulkShip = async (orders: OrderWithRates[]): Promise<ShippingResult[]> => {
    const shippingService = new BulkShippingService();
    return await shippingService.processOrdersForShipping(orders);
  };

  return {
    boxShippingGroups,
    loading,
    handleFetchRates,
    handleBulkShip
  };
};