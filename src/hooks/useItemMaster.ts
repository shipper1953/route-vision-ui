
import { useState, useEffect } from "react";
import { Item } from "@/types/itemMaster";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useItemMaster = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  // Fetch items from Supabase
  useEffect(() => {
    if (userProfile) {
      fetchItems();
    }
  }, [userProfile]);

  // Subscribe to Qboid realtime updates
  useEffect(() => {
    if (!userProfile) return;

    const channel = supabase
      .channel('qboid-item-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qboid_events'
        },
        (payload: any) => {
          const eventData = payload.new;
          if (eventData.event_type === 'item_dimensions_updated') {
            // Refresh items list when an item is updated via Qboid
            fetchItems();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Map database fields to frontend interface
      const mappedItems: Item[] = (data || []).map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        length: Number(item.length),
        width: Number(item.width),
        height: Number(item.height),
        weight: Number(item.weight),
        category: item.category,
        isActive: item.is_active,
        dimensionsUpdatedAt: item.dimensions_updated_at
      }));
      
      setItems(mappedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (itemData: Omit<Item, 'id'>) => {
    if (!userProfile?.company_id) {
      toast.error('Company information not found');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .insert({
          sku: itemData.sku,
          name: itemData.name,
          length: itemData.length,
          width: itemData.width,
          height: itemData.height,
          weight: itemData.weight,
          category: itemData.category,
          is_active: itemData.isActive,
          company_id: userProfile.company_id
        })
        .select()
        .single();

      if (error) throw error;

      // Map the created item and add to state
      const newItem: Item = {
        id: data.id,
        sku: data.sku,
        name: data.name,
        length: Number(data.length),
        width: Number(data.width),
        height: Number(data.height),
        weight: Number(data.weight),
        category: data.category,
        isActive: data.is_active,
        dimensionsUpdatedAt: data.dimensions_updated_at
      };

      setItems(prev => [...prev, newItem]);
      toast.success('Item created successfully');
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (updatedItem: Item) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          sku: updatedItem.sku,
          name: updatedItem.name,
          length: updatedItem.length,
          width: updatedItem.width,
          height: updatedItem.height,
          weight: updatedItem.weight,
          category: updatedItem.category,
          is_active: updatedItem.isActive
        })
        .eq('id', updatedItem.id);

      if (error) throw error;

      setItems(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));
      toast.success('Item updated successfully');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    loading,
    createItem,
    updateItem,
    deleteItem
  };
};
