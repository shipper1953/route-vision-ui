import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryAdjustment } from "@/hooks/useInventory";

interface AdjustInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjust: (adjustment: InventoryAdjustment) => Promise<void>;
  itemId?: string;
  warehouseId?: string;
  locationId?: string;
}

export const AdjustInventoryDialog = ({
  open,
  onOpenChange,
  onAdjust,
  itemId = '',
  warehouseId = '',
  locationId = ''
}: AdjustInventoryDialogProps) => {
  const [adjustment, setAdjustment] = useState<InventoryAdjustment>({
    item_id: itemId,
    warehouse_id: warehouseId,
    location_id: locationId,
    quantity_change: 0,
    reason: 'cycle_count',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAdjust(adjustment);
      onOpenChange(false);
      setAdjustment({
        item_id: '',
        warehouse_id: '',
        location_id: '',
        quantity_change: 0,
        reason: 'cycle_count',
        notes: ''
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Inventory</DialogTitle>
        </DialogHeader>
        
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
      </DialogContent>
    </Dialog>
  );
};
