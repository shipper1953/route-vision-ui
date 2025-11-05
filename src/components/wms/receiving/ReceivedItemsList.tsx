import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface ReceivedItemsListProps {
  items: any[];
}

const conditionColors = {
  good: "default",
  damaged: "destructive",
  expired: "secondary"
} as const;

export const ReceivedItemsList = ({ items }: ReceivedItemsListProps) => {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Received Items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No items received yet. Scan a barcode to begin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Received Items ({items.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {items.map((item, index) => (
              <div 
                key={item.id || index} 
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.items?.name || 'Unknown Item'}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.items?.sku || '-'}
                    </p>
                  </div>
                  <Badge variant={conditionColors[item.condition as keyof typeof conditionColors]}>
                    {item.condition}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Qty:</span>{' '}
                    <span className="font-medium">{item.quantity_received} {item.uom}</span>
                  </div>
                  {item.lot_number && (
                    <div>
                      <span className="text-muted-foreground">Lot:</span>{' '}
                      <span className="font-medium">{item.lot_number}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {format(new Date(item.received_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
