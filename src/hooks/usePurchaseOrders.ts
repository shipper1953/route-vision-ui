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
    if (!userProfile?.company_id && userProfile?.role !== 'super_admin') {
      toast.error('Company context not found');
      return null;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('purchase_orders' as any)
        .select('*, po_line_items(*)')
        .eq('id', id);

      if (userProfile?.company_id) {
        query = query.eq('company_id', userProfile.company_id);
      }

      const { data, error } = await query.single();

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
    if (!userProfile?.company_id) {
      toast.error('Company information not found');
      return null;
    }

    try {
      setLoading(true);

      const missingItem = lineItems.find(item => !item.item_id);
      if (missingItem) {
        toast.error('All purchase order line items must have an item selected');
        return null;
      }

      const itemIds = Array.from(new Set(lineItems.map(item => item.item_id)));

      const { data: itemsForCompany, error: itemsError } = await supabase
        .from('items')
        .select('id, company_id')
        .in('id', itemIds);

      if (itemsError) {
        toast.error(itemsError.message || 'Failed to validate line items');
        return null;
      }

      if (!itemsForCompany || itemsForCompany.length !== itemIds.length) {
        toast.error('One or more selected items are not available for this company');
        return null;
      }

      const invalidItem = itemsForCompany.find(item => item.company_id !== userProfile.company_id);
      if (invalidItem) {
        toast.error('Purchase orders can only include items that belong to your company');
        return null;
      }

      // Create PO
      const { data: po, error: poError } = await supabase
        .from('purchase_orders' as any)
        .insert([{
          ...poData,
          created_by: userProfile?.id,
          company_id: userProfile.company_id
        }])
        .select()
        .single();

      if (poError) throw poError;

      // Create line items
      const lineItemsWithPoId = lineItems.map((item, index) => ({
        ...item,
        po_id: (po as any).id,
        line_number: index + 1
      }));

      const { error: lineItemsError } = await supabase
        .from('po_line_items' as any)
        .insert(lineItemsWithPoId);

      if (lineItemsError) throw lineItemsError;

      setPurchaseOrders([po as unknown as PurchaseOrder, ...purchaseOrders]);
      toast.success('Purchase order created successfully');
      return po as unknown as PurchaseOrder;
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      toast.error(error.message || 'Failed to create purchase order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    if (!userProfile?.company_id && userProfile?.role !== 'super_admin') {
      toast.error('Company context not found');
      return null;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('purchase_orders' as any)
        .update(updates)
        .eq('id', id);

      if (userProfile?.company_id) {
        query = query.eq('company_id', userProfile.company_id);
      }

      const { data, error } = await query
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
