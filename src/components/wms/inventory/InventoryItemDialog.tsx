import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { InventoryAdjustment, InventoryItem } from "@/hooks/useInventory";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Package } from "lucide-react";

interface InventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjust: (adjustment: InventoryAdjustment) => Promise<void>;
  item: InventoryItem | null;
}

interface OrderAllocation {
  id: number;
  order_id: string;
  customer_name: string | null;
  status: string | null;
  order_date: string | null;
  quantity: number;
}

export const InventoryItemDialog = ({
  open,
  onOpenChange,
  onAdjust,
  item,
}: InventoryItemDialogProps) => {
  const { userProfile } = useAuth();
  const [adjustment, setAdjustment] = useState<InventoryAdjustment>({
    item_id: '',
    warehouse_id: '',
    location_id: '',
    quantity_change: 0,
    reason: 'cycle_count',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState<OrderAllocation[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);

  // Sync the adjustment defaults with the selected item
  useEffect(() => {
    setAdjustment({
      item_id: item?.item_id || '',
      warehouse_id: item?.warehouse_id || '',
      location_id: item?.location_id || '',
      quantity_change: 0,
      reason: 'cycle_count',
      notes: '',
      lot_number: item?.lot_number,
      serial_number: item?.serial_number,
    });
  }, [item]);

  // Fetch orders that have allocated this item
  useEffect(() => {
    const loadAllocations = async () => {
      if (!open || !item || !userProfile?.company_id) {
        setAllocations([]);
        return;
      }
      setAllocLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_id, customer_name, status, order_date, items')
          .eq('company_id', userProfile.company_id)
          .not('status', 'in', '(shipped,delivered,cancelled,canceled)')
          .order('order_date', { ascending: false })
          .limit(500);

        if (error) throw error;

        const matches: OrderAllocation[] = [];
        for (const order of data || []) {
          const orderItems = Array.isArray(order.items) ? order.items as any[] : [];
          let qty = 0;
          for (const oi of orderItems) {
            const matchById = item.item_id && (oi?.itemId === item.item_id || oi?.item_id === item.item_id || oi?.id === item.item_id);
            const matchBySku = item.item_sku && oi?.sku && String(oi.sku).toLowerCase() === String(item.item_sku).toLowerCase();
            if (matchById || matchBySku) {
              qty += Number(oi?.quantity || oi?.qty || 1);
            }
          }
          if (qty > 0) {
            matches.push({
              id: order.id,
              order_id: order.order_id,
              customer_name: order.customer_name,
              status: order.status,
              order_date: order.order_date,
              quantity: qty,
            });
          }
        }
        setAllocations(matches);
      } catch (err) {
        console.error('Failed to load allocations:', err);
        setAllocations([]);
      } finally {
        setAllocLoading(false);
      }
    };
    loadAllocations();
  }, [open, item, userProfile?.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAdjust(adjustment);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {item?.item_name || 'Inventory Item'}
          </DialogTitle>
          {item && (
            <DialogDescription>
              SKU: {item.item_sku} • Available: {item.quantity_available} • Allocated: {item.quantity_allocated} • On Hand: {item.quantity_on_hand}
            </DialogDescription>
          )}
        </DialogHeader>

        <Tabs defaultValue="adjust" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="adjust">Adjust Inventory</TabsTrigger>
            <TabsTrigger value="allocations">
              Allocations {item && item.quantity_allocated > 0 && (
                <Badge variant="secondary" className="ml-2">{item.quantity_allocated}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="adjust" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity_change">Quantity Change</Label>
                <Input
                  id="quantity_change"
                  type="number"
                  value={adjustment.quantity_change}
                  onChange={(e) => setAdjustment({ ...adjustment, quantity_change: parseInt(e.target.value) || 0 })}
                  placeholder="Enter positive or negative number"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use positive numbers to add, negative to subtract
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select
                  value={adjustment.reason}
                  onValueChange={(value) => setAdjustment({ ...adjustment, reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cycle_count">Cycle Count</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="found">Found</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot_number">Lot Number (Optional)</Label>
                <Input
                  id="lot_number"
                  value={adjustment.lot_number || ''}
                  onChange={(e) => setAdjustment({ ...adjustment, lot_number: e.target.value })}
                  placeholder="Enter lot number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={adjustment.notes}
                  onChange={(e) => setAdjustment({ ...adjustment, notes: e.target.value })}
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Adjusting...' : 'Adjust Inventory'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="allocations" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Open orders consuming this item
                </span>
                <span className="font-medium">
                  Total allocated: {totalAllocated}
                </span>
              </div>

              {allocLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading allocations...
                </div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No open orders allocate this item.
                </div>
              ) : (
                <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                  {allocations.map((a) => (
                    <div key={a.id} className="p-3 flex items-center justify-between hover:bg-accent/40">
                      <div className="space-y-1 min-w-0">
                        <div className="font-medium truncate">{a.order_id}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {a.customer_name || 'Unknown customer'}
                          {a.order_date && ` • ${new Date(a.order_date).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {a.status && (
                          <Badge variant="outline" className="capitalize">{a.status}</Badge>
                        )}
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{a.quantity}</div>
                          <div className="text-xs text-muted-foreground">qty</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
