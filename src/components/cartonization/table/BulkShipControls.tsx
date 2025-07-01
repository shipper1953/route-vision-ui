import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck } from "lucide-react";

interface BulkShipControlsProps {
  boxName: string;
  boxDimensions: string;
  orderCount: number;
  selectedCount: number;
  isShipping: boolean;
  onBulkShip: () => void;
}

export const BulkShipControls = ({
  boxName,
  boxDimensions,
  orderCount,
  selectedCount,
  isShipping,
  onBulkShip
}: BulkShipControlsProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-tms-blue" />
        <h3 className="text-lg font-semibold">
          Orders for {boxName} ({boxDimensions})
        </h3>
        <Badge variant="secondary">{orderCount} orders</Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selectedCount} selected
        </span>
        <Button 
          onClick={onBulkShip}
          disabled={selectedCount === 0 || isShipping}
          size="sm"
          className="gap-2"
        >
          <Truck className="h-4 w-4" />
          {isShipping ? "Shipping..." : `Ship Selected (${selectedCount})`}
        </Button>
      </div>
    </div>
  );
};