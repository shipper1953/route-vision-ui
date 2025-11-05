import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface BinTransfer {
  item_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  lot_number?: string;
  serial_number?: string;
  reason: string;
  notes?: string;
}

export const useBinTransfers = () => {
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  const transferBin = async (transfer: BinTransfer) => {
    setLoading(true);
    try {
      // Check source inventory
      const { data: sourceInventory, error: sourceError } = await supabase
        .from('inventory_levels' as any)
        .select('*')
        .eq('item_id', transfer.item_id)
        .eq('location_id', transfer.from_location_id)
        .eq('lot_number', transfer.lot_number || '')
        .eq('serial_number', transfer.serial_number || '')
        .single();

      if (sourceError || !sourceInventory) {
        throw new Error('Source inventory not found');
      }

      const sourceInv = sourceInventory as any;

      if (sourceInv.quantity_available < transfer.quantity) {
        throw new Error('Insufficient quantity available for transfer');
      }

      // Decrease source inventory
      const { error: decreaseError } = await supabase
        .from('inventory_levels' as any)
        .update({
          quantity_on_hand: sourceInv.quantity_on_hand - transfer.quantity,
          quantity_available: sourceInv.quantity_available - transfer.quantity
        })
        .eq('id', sourceInv.id);

      if (decreaseError) throw decreaseError;

      // Increase or create destination inventory
      const { data: destInventory, error: destFetchError } = await supabase
        .from('inventory_levels' as any)
        .select('*')
        .eq('item_id', transfer.item_id)
        .eq('location_id', transfer.to_location_id)
        .eq('lot_number', transfer.lot_number || '')
        .eq('serial_number', transfer.serial_number || '')
        .single();

      if (destFetchError && destFetchError.code !== 'PGRST116') throw destFetchError;

      if (destInventory) {
        const destInv = destInventory as any;
        // Update existing
        await supabase
          .from('inventory_levels' as any)
          .update({
            quantity_on_hand: destInv.quantity_on_hand + transfer.quantity,
            quantity_available: destInv.quantity_available + transfer.quantity
          })
          .eq('id', destInv.id);
      } else {
        // Create new
        await supabase
          .from('inventory_levels' as any)
          .insert({
            company_id: userProfile?.company_id,
            item_id: transfer.item_id,
            warehouse_id: sourceInv.warehouse_id,
            location_id: transfer.to_location_id,
            quantity_on_hand: transfer.quantity,
            quantity_available: transfer.quantity,
            lot_number: transfer.lot_number,
            serial_number: transfer.serial_number,
            condition: sourceInv.condition,
            expiry_date: sourceInv.expiry_date
          });
      }

      // Log the transfer
      await supabase
        .from('bin_transfers' as any)
        .insert({
          company_id: userProfile?.company_id,
          ...transfer,
          transferred_by: userProfile?.id
        });

      toast.success('Bin transfer completed successfully');
    } catch (error: any) {
      console.error('Error transferring bin:', error);
      toast.error(error.message || 'Failed to transfer bin');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    transferBin
  };
};
