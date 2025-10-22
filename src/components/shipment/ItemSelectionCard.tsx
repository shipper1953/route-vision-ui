import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Package, Weight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectedItem } from "@/types/fulfillment";
import { supabase } from "@/integrations/supabase/client";

interface ItemSelectionCardProps {
  orderItems: any[];
  onItemsSelected: (selectedItems: SelectedItem[]) => void;
  itemsAlreadyShipped?: Array<{ itemId: string; quantityShipped: number }>;
  orderId?: string | number;
}

export const ItemSelectionCard = ({ 
  orderItems, 
  onItemsSelected,
  itemsAlreadyShipped = [],
  orderId
}: ItemSelectionCardProps) => {
  const [localSelection, setLocalSelection] = useState<Map<string, number>>(new Map());
  const [shippedItemsFromDB, setShippedItemsFromDB] = useState<Map<string, number>>(new Map());

  // Fetch already shipped items from database
  useEffect(() => {
    if (!orderId) return;
    
    const fetchShippedItems = async () => {
      const orderIdNum = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      const { data: orderShipments } = await supabase
        .from('order_shipments')
        .select('package_info')
        .eq('order_id', orderIdNum);
      
      if (orderShipments) {
        const shippedMap = new Map<string, number>();
        
        orderShipments.forEach(os => {
          const packageInfo = os.package_info as any;
          if (packageInfo?.items && Array.isArray(packageInfo.items)) {
            packageInfo.items.forEach((item: any) => {
              const existing = shippedMap.get(item.itemId) || 0;
              shippedMap.set(item.itemId, existing + (item.quantity || 0));
            });
          }
        });
        
        setShippedItemsFromDB(shippedMap);
      }
    };
    
    fetchShippedItems();
  }, [orderId]);

  // Calculate remaining quantity for each item
  const getRemainingQuantity = (item: any) => {
    const itemKey = item.itemId || item.id;
    const alreadyShipped = shippedItemsFromDB.get(itemKey) || 0;
    return item.quantity - alreadyShipped;
  };

  // Check if all items are fully shipped
  const allItemsShipped = orderItems.every(item => getRemainingQuantity(item) <= 0);

  // Handle item toggle
  const handleToggleItem = (item: any) => {
    const itemKey = item.itemId || item.id;
    const newSelection = new Map(localSelection);
    
    if (newSelection.has(itemKey)) {
      newSelection.delete(itemKey);
    } else {
      const remaining = getRemainingQuantity(item);
      newSelection.set(itemKey, Math.min(1, remaining));
    }
    
    setLocalSelection(newSelection);
    updateParent(newSelection);
  };

  // Handle quantity change
  const handleQuantityChange = (item: any, quantity: number) => {
    const itemKey = item.itemId || item.id;
    const remaining = getRemainingQuantity(item);
    const validQty = Math.max(0, Math.min(quantity, remaining));
    
    const newSelection = new Map(localSelection);
    if (validQty > 0) {
      newSelection.set(itemKey, validQty);
    } else {
      newSelection.delete(itemKey);
    }
    
    setLocalSelection(newSelection);
    updateParent(newSelection);
  };

  // Convert local selection to parent format
  const updateParent = (selectionMap: Map<string, number>) => {
    const selectedItems: SelectedItem[] = [];
    selectionMap.forEach((quantity, itemId) => {
      const item = orderItems.find(i => (i.itemId || i.id) === itemId);
      if (item) {
        selectedItems.push({
          itemId: item.itemId || item.id,
          name: item.name,
          sku: item.sku,
          quantity: quantity,
          dimensions: item.dimensions
        });
      }
    });
    onItemsSelected(selectedItems);
  };

  // Calculate summary
  const selectedCount = localSelection.size;
  const totalSelectedQty = Array.from(localSelection.values()).reduce((sum, qty) => sum + qty, 0);
  const estimatedWeight = Array.from(localSelection.entries()).reduce((sum, [itemId, qty]) => {
    const item = orderItems.find(i => (i.itemId || i.id) === itemId);
    const itemWeight = item?.dimensions?.weight || 0;
    return sum + (itemWeight * qty);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Select Items to Ship
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allItemsShipped && (
          <Alert>
            <AlertDescription>
              All items in this order have already been shipped.
            </AlertDescription>
          </Alert>
        )}

        {!allItemsShipped && (
          <>
            <div className="space-y-3">
              {orderItems.map((item) => {
                const itemKey = item.itemId || item.id;
                const remaining = getRemainingQuantity(item);
                const isSelected = localSelection.has(itemKey);
                const selectedQty = localSelection.get(itemKey) || 0;
                const alreadyShipped = shippedItemsFromDB.get(itemKey) || 0;

                if (remaining <= 0) {
                  return (
                    <div key={itemKey} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg opacity-60">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox checked={false} disabled />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            SKU: {item.sku || 'N/A'}
                            {item.dimensions && (
                              <> • {item.dimensions.length}"×{item.dimensions.width}"×{item.dimensions.height}" • {item.dimensions.weight} lbs</>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          Already Shipped: {alreadyShipped}/{item.quantity}
                        </Badge>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={itemKey} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleItem(item)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {item.sku || 'N/A'}
                          {item.dimensions && (
                            <> • {item.dimensions.length}"×{item.dimensions.width}"×{item.dimensions.height}" • {item.dimensions.weight} lbs</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alreadyShipped > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {alreadyShipped} shipped
                          </Badge>
                        )}
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Qty:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={remaining}
                              value={selectedQty}
                              onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">of {remaining}</span>
                          </div>
                        )}
                        {!isSelected && (
                          <span className="text-xs text-muted-foreground">Available: {remaining}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCount > 0 && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedCount} items selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      <span className="font-medium">Total qty: {totalSelectedQty}</span>
                    </div>
                    {estimatedWeight > 0 && (
                      <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-primary" />
                        <span className="font-medium">Est. weight: {estimatedWeight.toFixed(2)} lbs</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
