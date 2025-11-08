import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface TransferOrderLineItem {
  id: string;
  transfer_id: string;
  item_id: string;
  uom: string;
  quantity_requested: number;
  quantity_received?: number;
  items?: any;
}

export interface TransferOrder {
  id: string;
  transfer_number: string;
  company_id: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  status: "draft" | "scheduled" | "in_transit" | "partially_received" | "received" | "cancelled";
  expected_departure?: string;
  expected_arrival?: string;
  notes?: string;
  transfer_line_items?: TransferOrderLineItem[];
  source_warehouse?: { id: string; name: string };
  destination_warehouse?: { id: string; name: string };
}

export const useTransferOrders = () => {
  const [transferOrders, setTransferOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchTransferOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.company_id]);

  const fetchTransferOrders = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("transfer_orders" as any)
        .select(
          "*, transfer_line_items(*, items(*)), source_warehouse:warehouses!transfer_orders_source_warehouse_id_fkey(id, name), destination_warehouse:warehouses!transfer_orders_destination_warehouse_id_fkey(id, name)"
        )
        .eq("company_id", userProfile.company_id)
        .in("status", ["scheduled", "in_transit", "partially_received"])
        .order("expected_arrival", { ascending: true });

      if (error) throw error;

      setTransferOrders((data as unknown as TransferOrder[]) || []);
    } catch (error: any) {
      console.error("Error fetching transfer orders:", error);
      if (error?.code === "42P01") {
        console.warn("Transfer orders table not available yet");
      } else {
        toast.error(error.message || "Failed to fetch transfer orders");
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    transferOrders,
    loading,
    fetchTransferOrders
  };
};
