import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryItem } from "@/hooks/useInventory";
import { Package, MapPin, Calendar } from "lucide-react";

interface InventoryListProps {
  inventory: InventoryItem[];
  onSelectItem?: (item: InventoryItem) => void;
}

export const InventoryList = ({ inventory, onSelectItem }: InventoryListProps) => {
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'good': return 'bg-green-500/10 text-green-500';
      case 'damaged': return 'bg-orange-500/10 text-orange-500';
      case 'expired': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2">
      {inventory.map((item) => (
        <Card
          key={item.id}
          className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => onSelectItem?.(item)}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{item.item_name}</span>
                <Badge variant="outline" className="text-xs">
                  {item.item_sku}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{item.location_name}</span>
              </div>

              {item.lot_number && (
                <div className="text-xs text-muted-foreground">
                  Lot: {item.lot_number}
                  {item.expiry_date && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires: {new Date(item.expiry_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="text-right space-y-2">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {item.quantity_available}
                </div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
              
              <div className="flex gap-2 text-xs">
                <div>
                  <div className="font-medium">{item.quantity_allocated}</div>
                  <div className="text-muted-foreground">Allocated</div>
                </div>
                <div>
                  <div className="font-medium">{item.quantity_on_hand}</div>
                  <div className="text-muted-foreground">On Hand</div>
                </div>
              </div>

              <Badge className={getConditionColor(item.condition)}>
                {item.condition}
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
