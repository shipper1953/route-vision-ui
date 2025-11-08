import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackageOpen } from "lucide-react";
import { format } from "date-fns";

interface TransferSelectionCardProps {
  transfer: any;
  onStartReceiving: (transferId: string, warehouseId: string) => void;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  scheduled: "secondary",
  in_transit: "default",
  partially_received: "secondary",
  received: "outline",
  cancelled: "destructive"
};

export const TransferSelectionCard = ({ transfer, onStartReceiving }: TransferSelectionCardProps) => {
  const variant = statusVariantMap[transfer.status as string] || "secondary";

  return (
    <Card className="hover:border-primary transition-colors cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{transfer.transfer_number}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {transfer.destination_warehouse?.name || transfer.destination_warehouse_id || "Unknown destination"}
            </p>
          </div>
          <Badge variant={variant} className="capitalize">
            {transfer.status?.replace(/_/g, " ") || "scheduled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Origin:</span>{" "}
            {transfer.source_warehouse?.name || transfer.source_warehouse_id || "Unknown"}
          </p>
          <p>
            <span className="text-muted-foreground">Destination:</span>{" "}
            {transfer.destination_warehouse?.name || transfer.destination_warehouse_id || "Unknown"}
          </p>
          {transfer.expected_arrival && (
            <p>
              <span className="text-muted-foreground">Expected:</span>{" "}
              {format(new Date(transfer.expected_arrival), "MMM d, yyyy")}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Line Items:</span>{" "}
            {transfer.transfer_line_items?.length || 0}
          </p>
        </div>
        <Button
          className="w-full"
          onClick={() => onStartReceiving(transfer.id, transfer.destination_warehouse_id)}
        >
          <PackageOpen className="mr-2 h-4 w-4" />
          Start Receiving
        </Button>
      </CardContent>
    </Card>
  );
};
