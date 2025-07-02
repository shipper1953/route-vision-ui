import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Calculator } from "lucide-react";

interface BulkShipControlsProps {
  boxName: string;
  boxDimensions: string;
  orderCount: number;
  selectedCount: number;
  isFetchingRates: boolean;
  onFetchRates: () => void;
}

export const BulkShipControls = ({
  boxName,
  boxDimensions,
  orderCount,
  selectedCount,
  isFetchingRates,
  onFetchRates
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
          onClick={onFetchRates}
          disabled={selectedCount === 0 || isFetchingRates}
          size="sm"
          className="gap-2"
        >
          <Calculator className="h-4 w-4" />
          {isFetchingRates ? "Fetching Rates..." : `Fetch Rates (${selectedCount})`}
        </Button>
      </div>
    </div>
  );
};