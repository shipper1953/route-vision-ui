import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface ReceivingSession {
  id: string;
  po_id: string;
  session_number: string;
  warehouse_id: string;
  receiving_user_id: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
}

interface ReceivingLineItem {
  id: string;
  session_id: string;
  po_line_id: string;
  item_id: string;
  uom: string;
  quantity_received: number;
  staging_location_id?: string;
  lot_number?: string;
  serial_numbers?: string[];
  condition: 'good' | 'damaged' | 'expired';
  quantity_damaged?: number;
  quantity_non_compliant?: number;
  quantity_accepted?: number;
  non_compliance_reason?: string;
  qc_required: boolean;
  qc_status?: 'pending' | 'passed' | 'failed';
  received_at: string;
  received_by?: string;
}

export const useWmsReceiving = () => {
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<ReceivingSession | null>(null);
  const [receivedItems, setReceivedItems] = useState<ReceivingLineItem[]>([]);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchPurchaseOrders();
    }
  }, [userProfile?.company_id]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('purchase_orders' as any)
        .select('*, customers(*), po_line_items(*, items(*))')
        .eq('company_id', userProfile?.company_id)
        .in('status', ['pending', 'partially_received'])
        .order('expected_date', { ascending: true });

      if (error) throw error;
      setPurchaseOrders(data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to fetch purchase orders');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createReceivingSession = async (poId: string, warehouseId: string) => {
    try {
      setLoading(true);
      
      // Generate session number
      const sessionNumber = `RCV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase
        .from('receiving_sessions' as any)
        .insert([{
          company_id: userProfile?.company_id,
          po_id: poId,
          session_number: sessionNumber,
          warehouse_id: warehouseId,
          user_id: userProfile?.id,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data as unknown as ReceivingSession);
      setReceivedItems([]);
      toast.success('Receiving session started');
      return data as unknown as ReceivingSession;
    } catch (error: any) {
      console.error('Error creating receiving session:', error);
      toast.error(error.message || 'Failed to start receiving session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const receiveItem = async (params: {
    sessionId: string;
    poLineId: string;
    itemId: string;
    uom: string;
    quantityReceived: number;
    stagingLocationId?: string;
    lotNumber?: string;
    serialNumbers?: string[];
    condition?: string;
    damagedQuantity?: number;
    nonCompliantQuantity?: number;
    nonComplianceReason?: string;
    qcRequired?: boolean;
  }) => {
    try {
      setLoading(true);

      const acceptedQty = Math.max(
        params.quantityReceived - (params.damagedQuantity || 0) - (params.nonCompliantQuantity || 0),
        0
      );

      const baseInsertPayload = {
        session_id: params.sessionId,
        po_line_id: params.poLineId,
        item_id: params.itemId,
        quantity_received: params.quantityReceived,
        uom: params.uom,
        lot_number: params.lotNumber,
        serial_numbers: params.serialNumbers,
        condition: params.condition || 'new',
        qc_required: params.qcRequired || false,
        received_by: userProfile?.id,
        received_at: new Date().toISOString(),
      };

      const extendedPayload = {
        ...baseInsertPayload,
        quantity_damaged: params.damagedQuantity || 0,
        quantity_non_compliant: params.nonCompliantQuantity || 0,
        quantity_accepted: acceptedQty,
        non_compliance_reason: params.nonComplianceReason,
      };

      let { error } = await supabase
        .from('receiving_line_items' as any)
        .insert(extendedPayload as any);

      // Backward-compatible fallback when DB migration isn't applied yet.
      if (error && String(error.message || '').includes('quantity_accepted')) {
        const fallbackNotes = [
          params.damagedQuantity ? `Damaged: ${params.damagedQuantity}` : null,
          params.nonCompliantQuantity ? `Non-compliant: ${params.nonCompliantQuantity}` : null,
          params.nonComplianceReason ? `Reason: ${params.nonComplianceReason}` : null,
        ].filter(Boolean).join(' | ');

        const fallbackPayload = {
          ...baseInsertPayload,
          notes: fallbackNotes || undefined,
        };

        const fallbackResult = await supabase
          .from('receiving_line_items' as any)
          .insert(fallbackPayload as any);

        error = fallbackResult.error;
      }

      if (error) throw error;

      // Update PO line item quantity
      const poLineResult = await supabase
        .from('po_line_items' as any)
        .select('quantity_received, quantity_ordered, po_id')
        .eq('id', params.poLineId)
        .single();

      if (!poLineResult.error && poLineResult.data) {
        const poLine = poLineResult.data as unknown as { quantity_received: number; quantity_ordered: number; po_id: string };
        const newQuantity = (poLine.quantity_received || 0) + acceptedQty;
        
        await supabase
          .from('po_line_items' as any)
          .update({ quantity_received: newQuantity })
          .eq('id', params.poLineId);

        // Check if PO is fully received
        const allLinesResult = await supabase
          .from('po_line_items' as any)
          .select('quantity_received, quantity_ordered')
          .eq('po_id', poLine.po_id);

        if (!allLinesResult.error && allLinesResult.data) {
          const allLines = allLinesResult.data as unknown as Array<{ quantity_received: number; quantity_ordered: number }>;
          const fullyReceived = allLines.every(
            (line) => line.quantity_received >= line.quantity_ordered
          );
          const partiallyReceived = allLines.some(
            (line) => line.quantity_received > 0
          );

          await supabase
            .from('purchase_orders' as any)
            .update({
              status: fullyReceived ? 'received' : (partiallyReceived ? 'partially_received' : 'pending')
            })
            .eq('id', poLine.po_id);
        }

        // Increase inventory for accepted qty and trigger Shopify sync.
        if (acceptedQty > 0) {
          const [sessionRes, poRes] = await Promise.all([
            supabase
              .from('receiving_sessions' as any)
              .select('company_id, warehouse_id')
              .eq('id', params.sessionId)
              .single(),
            supabase
              .from('purchase_orders' as any)
              .select('customer_id')
              .eq('id', poLine.po_id)
              .single()
          ]);
          const sessionData = sessionRes.data as any;
          const poData = poRes.data as any;

          if (sessionData?.warehouse_id) {
            const customerId = poData?.customer_id || null;
            const condition = params.condition || 'good';
            const lotNumber = params.lotNumber || null;
            const serialNumber = params.serialNumbers?.[0] || null;

            let matchQuery = supabase
              .from('inventory_levels' as any)
              .select('id, quantity_on_hand, quantity_available')
              .eq('company_id', sessionData.company_id)
              .eq('warehouse_id', sessionData.warehouse_id)
              .eq('item_id', params.itemId)
              .eq('condition', condition)
              .is('location_id', null);

            matchQuery = customerId
              ? matchQuery.eq('customer_id', customerId)
              : matchQuery.is('customer_id', null);
            matchQuery = lotNumber
              ? matchQuery.eq('lot_number', lotNumber)
              : matchQuery.is('lot_number', null);
            matchQuery = serialNumber
              ? matchQuery.eq('serial_number', serialNumber)
              : matchQuery.is('serial_number', null);

            const { data: existingInventoryRaw } = await matchQuery.maybeSingle();
            const existingInventory = existingInventoryRaw as any;

            if (existingInventory?.id) {
              await supabase
                .from('inventory_levels' as any)
                .update({
                  quantity_on_hand: (existingInventory.quantity_on_hand || 0) + acceptedQty,
                  quantity_available: (existingInventory.quantity_available || 0) + acceptedQty,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingInventory.id);
            } else {
              await supabase
                .from('inventory_levels' as any)
                .insert({
                  company_id: sessionData.company_id,
                  warehouse_id: sessionData.warehouse_id,
                  customer_id: customerId,
                  item_id: params.itemId,
                  quantity_on_hand: acceptedQty,
                  quantity_available: acceptedQty,
                  quantity_allocated: 0,
                  condition,
                  lot_number: lotNumber,
                  serial_number: serialNumber,
                  received_date: new Date().toISOString(),
                });
            }

            const { data: transactionRaw } = await supabase
              .from('inventory_transactions' as any)
              .insert({
                company_id: sessionData.company_id,
                warehouse_id: sessionData.warehouse_id,
                transaction_type: 'receive',
                item_id: params.itemId,
                quantity: acceptedQty,
                lot_number: params.lotNumber || null,
                serial_number: params.serialNumbers?.[0] || null,
                reference_type: 'receiving_session',
                reference_id: params.sessionId,
                performed_by: userProfile?.id,
                notes: `Received ${acceptedQty} units via WMS receiving`,
              })
              .select('id')
              .single();
            const transaction = transactionRaw as any;

            if (transaction?.id) {
              await supabase.functions.invoke('shopify-sync-receipt-to-shopify', {
                body: {
                  transactionId: transaction.id,
                  itemId: params.itemId,
                  quantityReceived: acceptedQty,
                  warehouseId: sessionData.warehouse_id,
                  locationId: null,
                }
              });
            }
          }
        }
      }

      // Fetch updated received items
      await fetchReceivedItems(params.sessionId);
      
      toast.success('Item received successfully');
      return true;
    } catch (error: any) {
      console.error('Error receiving item:', error);
      toast.error(error.message || 'Failed to receive item');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchReceivedItems = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('receiving_line_items' as any)
        .select('*, items(*)')
        .eq('session_id', sessionId)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setReceivedItems((data as unknown as ReceivingLineItem[]) || []);
    } catch (error) {
      console.error('Error fetching received items:', error);
    }
  };

  const completeReceivingSession = async (sessionId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('receiving_sessions' as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      setActiveSession(null);
      setReceivedItems([]);
      await fetchPurchaseOrders();
      toast.success('Receiving session completed');
      return true;
    } catch (error: any) {
      console.error('Error completing receiving session:', error);
      toast.error(error.message || 'Failed to complete receiving session');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const pauseReceivingSession = async (sessionId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('receiving_sessions' as any)
        .update({ status: 'in_progress' })
        .eq('id', sessionId);

      if (error) throw error;

      setActiveSession(null);
      setReceivedItems([]);
      toast.success('Receiving session paused');
      return true;
    } catch (error: any) {
      console.error('Error pausing receiving session:', error);
      toast.error(error.message || 'Failed to pause receiving session');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    purchaseOrders,
    activeSession,
    receivedItems,
    fetchPurchaseOrders,
    createReceivingSession,
    receiveItem,
    fetchReceivedItems,
    completeReceivingSession,
    pauseReceivingSession
  };
};
