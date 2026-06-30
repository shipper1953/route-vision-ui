import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PutawayTask {
  id: string;
  company_id: string;
  warehouse_id: string;
  receiving_line_item_id?: string;
  item_id: string;
  from_location_id?: string | null;
  to_location_id?: string | null;
  quantity_to_putaway: number;
  quantity_put_away: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assigned_to?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  items?: { name?: string; sku?: string };
  from_location?: { name?: string };
  to_location?: { name?: string };
}

export const usePutawayTasks = (warehouseId?: string) => {
  const [tasks, setTasks] = useState<PutawayTask[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchPutawayTasks();
    }
  }, [userProfile?.company_id, warehouseId]);

  const fetchPutawayTasks = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("putaway_tasks" as any)
        .select("*, items:item_id(name, sku), from_location:from_location_id(name), to_location:to_location_id(name)")
        .eq("company_id", userProfile?.company_id)
        .order("created_at", { ascending: false });

      if (warehouseId) {
        query = query.eq("warehouse_id", warehouseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTasks((data as unknown as PutawayTask[]) || []);
    } catch (error) {
      console.error("Error fetching putaway tasks:", error);
      toast.error("Failed to fetch putaway tasks");
    } finally {
      setLoading(false);
    }
  };

  const startPutawayTask = async (taskId: string) => {
    const { error } = await supabase
      .from("putaway_tasks" as any)
      .update({ status: "in_progress", started_at: new Date().toISOString(), assigned_to: userProfile?.id })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to start putaway task");
      throw error;
    }

    toast.success("Putaway task started");
    await fetchPutawayTasks();
  };

  const completePutawayTask = async (task: PutawayTask, toLocationId: string, quantity: number) => {
    try {
      setLoading(true);

      if (!toLocationId) throw new Error("Select a destination bin");
      if (quantity <= 0 || quantity > task.quantity_to_putaway) {
        throw new Error("Putaway quantity must be greater than zero and no more than the task quantity");
      }

      const now = new Date().toISOString();
      const lotOrSerialFilter = { item_id: task.item_id, warehouse_id: task.warehouse_id };

      let sourceQuery = supabase
        .from("inventory_levels" as any)
        .select("*")
        .match(lotOrSerialFilter)
        .limit(1);
      sourceQuery = task.from_location_id
        ? sourceQuery.eq("location_id", task.from_location_id)
        : sourceQuery.is("location_id", null);
      const { data: sourceRows, error: sourceError } = await sourceQuery;

      if (sourceError) throw sourceError;
      const source = (sourceRows as any[])?.[0];
      if (source) {
        await supabase
          .from("inventory_levels" as any)
          .update({
            quantity_on_hand: Math.max((source.quantity_on_hand || 0) - quantity, 0),
            quantity_available: Math.max((source.quantity_available || 0) - quantity, 0),
            updated_at: now,
          })
          .eq("id", source.id);
      }

      const { data: destRows, error: destError } = await supabase
        .from("inventory_levels" as any)
        .select("*")
        .match({ ...lotOrSerialFilter, location_id: toLocationId })
        .limit(1);

      if (destError) throw destError;
      const dest = (destRows as any[])?.[0];
      if (dest) {
        await supabase
          .from("inventory_levels" as any)
          .update({
            quantity_on_hand: (dest.quantity_on_hand || 0) + quantity,
            quantity_available: (dest.quantity_available || 0) + quantity,
            updated_at: now,
          })
          .eq("id", dest.id);
      } else {
        await supabase.from("inventory_levels" as any).insert({
          company_id: userProfile?.company_id,
          warehouse_id: task.warehouse_id,
          item_id: task.item_id,
          location_id: toLocationId,
          quantity_on_hand: quantity,
          quantity_available: quantity,
          quantity_allocated: 0,
          condition: "good",
          received_date: now,
        });
      }

      const completed = quantity >= task.quantity_to_putaway;
      const { error: taskError } = await supabase
        .from("putaway_tasks" as any)
        .update({
          to_location_id: toLocationId,
          quantity_put_away: quantity,
          status: completed ? "completed" : "in_progress",
          completed_at: completed ? now : null,
          updated_at: now,
        })
        .eq("id", task.id);

      if (taskError) throw taskError;

      if (task.receiving_line_item_id && completed) {
        await supabase
          .from("receiving_line_items" as any)
          .update({ putaway_status: "completed" })
          .eq("id", task.receiving_line_item_id);
      }

      toast.success("Putaway completed");
      await fetchPutawayTasks();
    } catch (error: any) {
      console.error("Error completing putaway:", error);
      toast.error(error.message || "Failed to complete putaway");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { tasks, loading, fetchPutawayTasks, startPutawayTask, completePutawayTask };
};
