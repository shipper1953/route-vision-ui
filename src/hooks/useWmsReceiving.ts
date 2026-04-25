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
  status: 'in_progress' | 'paused' | 'completed' | 'cancelled';
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
    qcRequired?: boolean;
  }) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('receiving_line_items' as any)
        .insert({
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
        });

      if (error) throw error;

      // Update PO line item quantity
      const poLineResult = await supabase
        .from('po_line_items' as any)
        .select('quantity_received, quantity_ordered, po_id')
        .eq('id', params.poLineId)
        .single();

      if (!poLineResult.error && poLineResult.data) {
        const poLine = poLineResult.data as unknown as { quantity_received: number; quantity_ordered: number; po_id: string };
        const newQuantity = (poLine.quantity_received || 0) + params.quantityReceived;
        
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
        .update({ status: 'paused' })
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
