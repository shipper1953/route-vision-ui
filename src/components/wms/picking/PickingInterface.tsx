import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PickingSession, PickListItem } from "@/hooks/usePicking";
import { Package, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PickingInterfaceProps {
  session: PickingSession;
  onPickItem: (itemId: string, quantity: number, lotNumber?: string, serialNumber?: string) => Promise<void>;
  onComplete: () => void;
  onCancel: () => void;
}

export const PickingInterface = ({ session, onPickItem, onComplete, onCancel }: PickingInterfaceProps) => {
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [quantityToPick, setQuantityToPick] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const currentItem = session.items[session.currentItemIndex];
  const totalItems = session.items.reduce((sum, item) => sum + item.quantity_ordered, 0);
  const pickedItems = session.items.reduce((sum, item) => sum + item.quantity_picked, 0);
  const progress = totalItems > 0 ? (pickedItems / totalItems) * 100 : 0;

  const handleScan = async () => {
    if (!scannedBarcode || !currentItem) {
      toast.error('Please scan a barcode');
      return;
    }

    // Verify barcode matches item SKU
    if (scannedBarcode !== currentItem.item_sku) {
      toast.error('Scanned item does not match expected item');
      return;
    }

    const qtyToPick = parseInt(quantityToPick) || 1;
    const remaining = currentItem.quantity_ordered - currentItem.quantity_picked;

    if (qtyToPick > remaining) {
      toast.error(`Cannot pick more than ${remaining} items`);
      return;
    }

    setProcessing(true);
    try {
      await onPickItem(currentItem.id, qtyToPick, lotNumber || undefined);
      
      // Reset form
      setScannedBarcode('');
      setQuantityToPick('');
      setLotNumber('');
    } catch (error) {
      // Error handled by hook
    } finally {
      setProcessing(false);
    }
  };

  const isSessionComplete = session.items.every(
    item => item.quantity_picked >= item.quantity_ordered
  );

  if (isSessionComplete) {
    return (
      <Card className="p-8 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h3 className="text-2xl font-bold">All Items Picked!</h3>
        <p className="text-muted-foreground">
          You've successfully picked all items for this order.
        </p>
        <Button onClick={onComplete} size="lg" className="mt-4">
          Complete Picking Session
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-primary/5 border-primary">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Order #{session.orderNumber}</span>
            <Badge>{Math.round(progress)}% Complete</Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {pickedItems} of {totalItems} items picked
          </div>
        </div>
      </Card>

      {currentItem && (
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">{currentItem.item_name}</span>
              </div>
              <Badge variant="outline">{currentItem.item_sku}</Badge>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {currentItem.quantity_ordered - currentItem.quantity_picked}
              </div>
              <div className="text-sm text-muted-foreground">to pick</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Location: {currentItem.location_name}</span>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="barcode">Scan Item Barcode</Label>
              <Input
                id="barcode"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                placeholder="Scan or enter barcode..."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantityToPick}
                  onChange={(e) => setQuantityToPick(e.target.value)}
                  placeholder="1"
                  min="1"
                  max={currentItem.quantity_ordered - currentItem.quantity_picked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lot">Lot# (Optional)</Label>
                <Input
                  id="lot"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="Lot number"
                />
              </div>
            </div>

            <Button
              onClick={handleScan}
              disabled={!scannedBarcode || processing}
              className="w-full"
              size="lg"
            >
              {processing ? 'Processing...' : 'Confirm Pick'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Remaining Items</div>
          <div className="space-y-1">
            {session.items.slice(session.currentItemIndex + 1, session.currentItemIndex + 4).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-accent/30 rounded">
                <span className="text-muted-foreground">{item.item_name}</span>
                <Badge variant="outline">{item.location_name}</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Button variant="outline" onClick={onCancel} className="w-full">
        Cancel Session
      </Button>
    </div>
  );
};
