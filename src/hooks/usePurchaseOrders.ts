import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PurchaseOrderLineItem {
  id?: string;
  po_id?: string;
  item_id: string;
  uom: string;
  quantity_ordered: number;
  quantity_received?: number;
  unit_cost: number;
  line_number: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  company_id: string;
  customer_id: string;
  warehouse_id: string;
  vendor_name?: string;
  vendor_contact?: string;
  expected_date?: string;
  status: 'pending' | 'partially_received' | 'received' | 'closed' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  const fetchPurchaseOrders = async (filters?: {
    status?: string;
    customer_id?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('purchase_orders' as any)
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.startDate) {
        query = query.gte('expected_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('expected_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPurchaseOrders((data as unknown as PurchaseOrder[]) || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrderById = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders' as any)
        .select('*, po_line_items(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      toast.error('Failed to fetch purchase order details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createPurchaseOrder = async (
    poData: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>,
    lineItems: PurchaseOrderLineItem[]
  ) => {
    let createdPoId: string | null = null;
    try {
      setLoading(true);

      const validLineItems = lineItems.filter((item) => item.item_id && item.quantity_ordered > 0);
      if (validLineItems.length === 0) {
        toast.error('Add at least one valid SKU line with quantity greater than 0');
        return null;
      }

      const poNumber = (poData.po_number || '').trim();
      if (!poNumber) {
        toast.error('PO number is required');
        return null;
      }

      const { data: existingPo } = await supabase
        .from('purchase_orders' as any)
        .select('id, po_number')
        .eq('company_id', userProfile?.company_id)
        .eq('po_number', poNumber)
        .maybeSingle();

      if (existingPo) {
        toast.error(`PO ${poNumber} already exists. Open that PO or use a new number.`);
        return null;
      }

      // Create PO
      const { data: po, error: poError } = await supabase
        .from('purchase_orders' as any)
        .insert([{
          ...poData,
          po_number: poNumber,
          created_by: userProfile?.id
        }])
        .select()
        .single();

      if (poError) throw poError;
      createdPoId = (po as any).id;

      // Create line items
      const itemIds = validLineItems.map((item) => item.item_id);
      const { data: itemRows, error: itemFetchError } = await supabase
        .from('items' as any)
        .select('id, sku, name')
        .in('id', itemIds);

      if (itemFetchError) throw itemFetchError;

      const itemById = new Map((itemRows || []).map((row: any) => [row.id, row]));

      const lineItemsWithPoId = validLineItems.map((item) => {
        const selectedItem = itemById.get(item.item_id);
        if (!selectedItem) {
          throw new Error('One or more selected SKUs no longer exist. Please reselect line items.');
        }

        return {
          po_id: (po as any).id,
          item_id: item.item_id,
          sku: selectedItem.sku,
          product_name: selectedItem.name,
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received || 0,
          unit_cost: item.unit_cost,
          uom: item.uom || 'each'
        };
      });

      const { error: lineItemsError } = await supabase
        .from('po_line_items' as any)
        .insert(lineItemsWithPoId);

      if (lineItemsError) throw lineItemsError;

      setPurchaseOrders([po as unknown as PurchaseOrder, ...purchaseOrders]);
      toast.success('Purchase order created successfully');
      return po as unknown as PurchaseOrder;
    } catch (error: any) {
      console.error('Error creating purchase order:', error);

      // Keep PO + lines creation atomic from the UI perspective.
      if (createdPoId) {
        await supabase.from('purchase_orders' as any).delete().eq('id', createdPoId);
      }

      toast.error(error.message || 'Failed to create purchase order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPurchaseOrders(purchaseOrders.map(po => po.id === id ? data as unknown as PurchaseOrder : po));
      toast.success('Purchase order updated successfully');
      return data as unknown as PurchaseOrder;
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      toast.error(error.message || 'Failed to update purchase order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelPurchaseOrder = async (id: string) => {
    return updatePurchaseOrder(id, { status: 'cancelled' });
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [userProfile?.company_id]);

  return {
    purchaseOrders,
    loading,
    fetchPurchaseOrders,
    fetchPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    cancelPurchaseOrder
  };
};
