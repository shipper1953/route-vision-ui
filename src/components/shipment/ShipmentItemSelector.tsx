import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package } from 'lucide-react';
import { SelectedItem } from '@/types/fulfillment';
import { OrderItem } from '@/types/orderTypes';

interface ShipmentItemSelectorProps {
  orderItems: OrderItem[];
  onItemsSelected: (items: SelectedItem[]) => void;
  selectedItems: SelectedItem[];
  itemsAlreadyShipped?: { [itemId: string]: number };
}

export const ShipmentItemSelector = ({
  orderItems,
  onItemsSelected,
  selectedItems,
  itemsAlreadyShipped = {}
}: ShipmentItemSelectorProps) => {
  const [localSelection, setLocalSelection] = useState<Map<string, number>>(new Map());

  // Initialize selection from props
  useEffect(() => {
    const newMap = new Map<string, number>();
    selectedItems.forEach(item => {
      newMap.set(item.itemId, item.quantity);
    });
    setLocalSelection(newMap);
  }, [selectedItems]);

  const getRemainingQuantity = (item: OrderItem) => {
    const shipped = itemsAlreadyShipped[item.itemId] || 0;
    return item.quantity - shipped;
  };

  const isFullyShipped = (item: OrderItem) => {
    return getRemainingQuantity(item) <= 0;
  };

  const handleToggleItem = (item: OrderItem) => {
    const newMap = new Map(localSelection);
    if (newMap.has(item.itemId)) {
      newMap.delete(item.itemId);
    } else {
      const remaining = getRemainingQuantity(item);
      newMap.set(item.itemId, Math.min(1, remaining));
    }
    setLocalSelection(newMap);
    updateParent(newMap);
  };

  const handleQuantityChange = (item: OrderItem, quantity: number) => {
    const remaining = getRemainingQuantity(item);
    const validQuantity = Math.max(0, Math.min(quantity, remaining));
    
    const newMap = new Map(localSelection);
    if (validQuantity > 0) {
      newMap.set(item.itemId, validQuantity);
    } else {
      newMap.delete(item.itemId);
    }
    setLocalSelection(newMap);
    updateParent(newMap);
  };

  const updateParent = (selectionMap: Map<string, number>) => {
    const selected: SelectedItem[] = [];
    selectionMap.forEach((quantity, itemId) => {
      const orderItem = orderItems.find(i => i.itemId === itemId);
      if (orderItem && quantity > 0) {
        selected.push({
          itemId: orderItem.itemId,
          sku: orderItem.sku || '',
          name: orderItem.name || '',
          quantity,
          unitPrice: orderItem.unitPrice,
          dimensions: orderItem.dimensions
        });
      }
    });
    onItemsSelected(selected);
  };

  const getTotalWeight = () => {
    let total = 0;
    localSelection.forEach((quantity, itemId) => {
      const item = orderItems.find(i => i.itemId === itemId);
      if (item?.dimensions?.weight) {
        total += item.dimensions.weight * quantity;
      }
    });
    return total;
  };

  const allShipped = orderItems.every(item => isFullyShipped(item));

  if (allShipped) {
    return (
      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          All items in this order have already been shipped.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Select Items to Ship
        </CardTitle>
        <CardDescription>
          Choose which items to include in this shipment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orderItems.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No items found in this order.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-3">
              {orderItems.map((item) => {
                const remaining = getRemainingQuantity(item);
                const fullyShipped = isFullyShipped(item);
                const selectedQty = localSelection.get(item.itemId) || 0;
                const isSelected = selectedQty > 0;

                return (
                  <div
                    key={item.itemId}
                    className={`flex items-center gap-3 p-3 border rounded-lg ${
                      fullyShipped ? 'opacity-50 bg-muted' : ''
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleItem(item)}
                      disabled={fullyShipped}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        SKU: {item.sku || 'N/A'}
                      </div>
                      {item.dimensions && (
                        <div className="text-xs text-muted-foreground">
                          {item.dimensions.length}" × {item.dimensions.width}" × {item.dimensions.height}" • {item.dimensions.weight} oz
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {fullyShipped ? (
                        <Badge variant="outline">Shipped</Badge>
                      ) : (
                        <>
                          <Label htmlFor={`qty-${item.itemId}`} className="text-sm text-nowrap">
                            Quantity:
                          </Label>
                          <Input
                            id={`qty-${item.itemId}`}
                            type="number"
                            min="0"
                            max={remaining}
                            value={selectedQty}
                            onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0)}
                            disabled={!isSelected}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            / {remaining}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {localSelection.size > 0 && (
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Selected Items:</span>
                  <span>{localSelection.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Quantity:</span>
                  <span>{Array.from(localSelection.values()).reduce((a, b) => a + b, 0)}</span>
                </div>
                {getTotalWeight() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Estimated Weight:</span>
                    <span>{getTotalWeight().toFixed(2)} oz</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
