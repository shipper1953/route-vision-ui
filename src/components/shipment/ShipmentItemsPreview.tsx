import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { useState } from 'react';
import { SelectedItem } from '@/types/fulfillment';

interface ShipmentItemsPreviewProps {
  items: SelectedItem[];
  compact?: boolean;
}

export const ShipmentItemsPreview = ({ items, compact = false }: ShipmentItemsPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!items || items.length === 0) {
    return (
      <Badge variant="outline" className="gap-1">
        <Package className="h-3 w-3" />
        No items data
      </Badge>
    );
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  if (compact) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Package className="h-3 w-3" />
        {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
      </Badge>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger className="flex items-center gap-2 hover:bg-muted/50 rounded p-2 w-full">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Package className="h-4 w-4" />
        <span className="text-sm font-medium">
          {items.length} {items.length === 1 ? 'Item' : 'Items'} ({totalQuantity} total)
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 p-2 border rounded bg-muted/30">
            <div className="flex-1">
              <div className="font-medium text-sm">{item.name}</div>
              <div className="text-xs text-muted-foreground">SKU: {item.sku || 'N/A'}</div>
              {item.dimensions && (
                <div className="text-xs text-muted-foreground">
                  {item.dimensions.length}" × {item.dimensions.width}" × {item.dimensions.height}" • {item.dimensions.weight} oz
                </div>
              )}
            </div>
            <Badge variant="outline" className="shrink-0">
              Qty: {item.quantity}
            </Badge>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
