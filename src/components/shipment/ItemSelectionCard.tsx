import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Package, Weight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectedItem } from "@/types/fulfillment";
import { supabase } from "@/integrations/supabase/client";
import { useItemMaster } from "@/hooks/useItemMaster";

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
  const { items: masterItems } = useItemMaster();

  // Build SKU + id lookup maps so we can backfill dims/weight when the order
  // line item only carries name/sku/qty (typical for Shopify-imported orders).
  const masterBySku = useMemo(() => {
    const m = new Map<string, any>();
    masterItems.forEach((mi: any) => {
      if (mi?.sku) m.set(String(mi.sku).toLowerCase(), mi);
    });
    return m;
  }, [masterItems]);
  const masterById = useMemo(() => {
    const m = new Map<string, any>();
    masterItems.forEach((mi: any) => {
      if (mi?.id) m.set(String(mi.id), mi);
    });
    return m;
  }, [masterItems]);

  const resolveDims = (item: any) => {
    if (item?.dimensions && (item.dimensions.length || item.dimensions.width || item.dimensions.height || item.dimensions.weight)) {
      return item.dimensions;
    }
    if (item?.length || item?.width || item?.height || item?.weight) {
      return { length: item.length, width: item.width, height: item.height, weight: item.weight };
    }
    const lookupId = item?.itemId || item?.id;
    const master = (item?.sku && masterBySku.get(String(item.sku).toLowerCase()))
      || (lookupId && masterById.get(String(lookupId)));
    if (master) {
      return { length: master.length, width: master.width, height: master.height, weight: master.weight };
    }
    return null;
  };

  // Create a unique key combining itemId, name, sku, and unitPrice to handle duplicate line items
  const getUniqueItemKey = (item: any, index?: number): string => {
    const baseId = item.itemId || item.id;
    const name = item.name || '';
    const sku = item.sku || '';
    const price = item.unitPrice ?? '';
    return `${baseId}__${name}__${sku}__${price}${index !== undefined ? `__idx${index}` : ''}`;
  };

  // Fetch already shipped items from database
  useEffect(() => {
    const fetchShippedItems = async () => {
      if (!orderId) {
        console.log('⏭️ No orderId provided, skipping shipped items fetch');
        return;
      }
      
      const orderIdNum = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;
      console.log('📦 Fetching shipped items for order:', orderIdNum);
      
      const { data: orderShipments, error } = await supabase
        .from('order_shipments')
        .select('package_info')
        .eq('order_id', orderIdNum);
      
      if (error) {
        console.error('❌ Error fetching shipped items:', error);
        return;
      }
      
      if (!orderShipments || orderShipments.length === 0) {
        console.log('ℹ️ No previous shipments found for order', orderIdNum);
        return;
      }
      
      console.log('📦 Fetched', orderShipments.length, 'order_shipments for order', orderIdNum);
      const shippedMap = new Map<string, number>();
      let nullPackageInfoCount = 0;
      
      orderShipments.forEach((os, index) => {
        // Handle NULL package_info gracefully
        if (!os.package_info) {
          nullPackageInfoCount++;
          console.warn(`⚠️ order_shipment record ${index + 1} has NULL package_info - cannot track these items`);
          return;
        }
        
        const packageInfo = os.package_info as any;
        if (packageInfo?.items && Array.isArray(packageInfo.items)) {
          console.log(`✅ Processing package_info from shipment ${index + 1}:`, packageInfo.items.length, 'items');
          packageInfo.items.forEach((item: any) => {
            // Use unique key if available, fallback to itemId for legacy data
            const key = item._uniqueKey || item.itemId;
            const existing = shippedMap.get(key) || 0;
            shippedMap.set(key, existing + (item.quantity || 0));
          });
        } else {
          console.warn(`⚠️ order_shipment record ${index + 1} has invalid package_info structure:`, packageInfo);
        }
      });
      
      if (nullPackageInfoCount > 0) {
        console.warn(`⚠️ ${nullPackageInfoCount} shipment(s) have NULL package_info - partial fulfillment tracking may be inaccurate`);
      }
      
      console.log('📊 Final shipped items map:', Object.fromEntries(shippedMap));
      setShippedItemsFromDB(shippedMap);
    };
    
    fetchShippedItems();
  }, [orderId]);

  // Get shipped quantity, checking both new and legacy key formats
  const getShippedQuantity = (item: any, index?: number) => {
    const newKey = getUniqueItemKey(item, index);
    // Check new key format first, then legacy format without price/index
    const baseId = item.itemId || item.id;
    const legacyKey = `${baseId}__${item.name || ''}__${item.sku || ''}`;
    return shippedItemsFromDB.get(newKey) || shippedItemsFromDB.get(legacyKey) || 0;
  };

  // Calculate remaining quantity for each item
  const getRemainingQuantity = (item: any, index?: number) => {
    const alreadyShipped = getShippedQuantity(item, index);
    return item.quantity - alreadyShipped;
  };

  // Check if all items are fully shipped
  const allItemsShipped = orderItems.every((item, index) => getRemainingQuantity(item, index) <= 0);

  // Handle item toggle
  const handleToggleItem = (item: any, index: number) => {
    const itemKey = getUniqueItemKey(item, index);
    const newSelection = new Map(localSelection);
    
    if (newSelection.has(itemKey)) {
      newSelection.delete(itemKey);
    } else {
      const remaining = getRemainingQuantity(item, index);
      newSelection.set(itemKey, Math.min(1, remaining));
    }
    
    setLocalSelection(newSelection);
    updateParent(newSelection);
  };

  // Handle quantity change
  const handleQuantityChange = (item: any, quantity: number, index: number) => {
    const itemKey = getUniqueItemKey(item, index);
    const remaining = getRemainingQuantity(item, index);
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
    selectionMap.forEach((quantity, uniqueKey) => {
      const item = orderItems.find((i, idx) => getUniqueItemKey(i, idx) === uniqueKey);
      if (item) {
        const dims = item.dimensions || (item.length && item.width && item.height ? {
          length: item.length,
          width: item.width,
          height: item.height,
          weight: item.weight || 0
        } : undefined);
        selectedItems.push({
          itemId: item.itemId || item.id,
          name: item.name,
          sku: item.sku,
          quantity: quantity,
          unitPrice: item.unitPrice ?? item.unit_price,
          dimensions: dims,
          _uniqueKey: uniqueKey
        });
      }
    });
    onItemsSelected(selectedItems);
  };

  // Calculate summary
  const selectedCount = localSelection.size;
  const totalSelectedQty = Array.from(localSelection.values()).reduce((sum, qty) => sum + qty, 0);
  const estimatedWeight = Array.from(localSelection.entries()).reduce((sum, [uniqueKey, qty]) => {
    const item = orderItems.find((i, idx) => getUniqueItemKey(i, idx) === uniqueKey);
    const itemWeight = item?.dimensions?.weight || item?.weight || 0;
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
        {orderItems.length === 0 && (
          <Alert>
            <AlertDescription>
              This order has no items available to ship.
            </AlertDescription>
          </Alert>
        )}
        
        {orderItems.length > 0 && allItemsShipped && (
          <Alert>
            <AlertDescription>
              All items in this order have already been shipped.
            </AlertDescription>
          </Alert>
        )}

        {!allItemsShipped && (
          <>
            <div className="space-y-3">
              {orderItems.map((item, index) => {
                const itemKey = getUniqueItemKey(item, index);
                const remaining = getRemainingQuantity(item, index);
                const isSelected = localSelection.has(itemKey);
                const selectedQty = localSelection.get(itemKey) || 0;
                const alreadyShipped = getShippedQuantity(item, index);

                // Resolve dims/weight from the order line, falling back to the master item record.
                const dims = resolveDims(item);
                const hasDims = dims && (dims.length || dims.width || dims.height);
                const hasWeight = dims && (dims.weight ?? null) !== null && dims.weight !== undefined;
                const dimsLabel = hasDims
                  ? `${dims.length ?? '?'}"×${dims.width ?? '?'}"×${dims.height ?? '?'}"`
                  : null;
                const weightLabel = hasWeight ? `${dims.weight} lbs` : null;
                const metaParts = [
                  `SKU: ${item.sku || 'N/A'}`,
                  dimsLabel,
                  weightLabel,
                ].filter(Boolean);

                if (remaining <= 0) {
                  return (
                    <div key={itemKey} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg opacity-60">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox checked={false} disabled />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {metaParts.join(' • ')}
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
                        onCheckedChange={() => handleToggleItem(item, index)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {metaParts.join(' • ')}
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
                              onChange={(e) => handleQuantityChange(item, parseInt(e.target.value) || 0, index)}
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
