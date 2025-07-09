
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Check, ShoppingCart } from "lucide-react";
import { useItemMaster } from "@/hooks/useItemMaster";

interface OrderItem {
  itemId: string;
  quantity: number;
  unitPrice?: number;
  name?: string;
  sku?: string;
}

interface OrderItemsBoxProps {
  orderItems: OrderItem[];
  onItemsScanned: (scannedItems: OrderItem[]) => void;
}

export const OrderItemsBox = ({ orderItems, onItemsScanned }: OrderItemsBoxProps) => {
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [scannedQuantities, setScannedQuantities] = useState<Record<string, number>>({});
  const { items: masterItems } = useItemMaster();

  const handleItemClick = (itemId: string, maxQuantity: number) => {
    const currentQuantity = scannedQuantities[itemId] || 0;
    const newQuantity = currentQuantity + 1;
    
    if (newQuantity <= maxQuantity) {
      setScannedQuantities(prev => ({
        ...prev,
        [itemId]: newQuantity
      }));
      
      if (newQuantity === maxQuantity) {
        setScannedItems(prev => new Set([...prev, itemId]));
      }
    }
  };

  const handleItemUncheck = (itemId: string) => {
    setScannedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
    setScannedQuantities(prev => ({
      ...prev,
      [itemId]: 0
    }));
  };

  useEffect(() => {
    // Notify parent of scanned items
    const scannedOrderItems = orderItems.filter(item => 
      scannedItems.has(item.itemId)
    ).map(item => ({
      ...item,
      quantity: scannedQuantities[item.itemId] || item.quantity
    }));
    
    onItemsScanned(scannedOrderItems);
  }, [scannedItems, scannedQuantities, orderItems]); // Removed onItemsScanned from dependencies

  const getItemDetails = (itemId: string) => {
    return masterItems.find(item => item.id === itemId);
  };

  const isItemFullyScanned = (itemId: string, requiredQuantity: number) => {
    return (scannedQuantities[itemId] || 0) >= requiredQuantity;
  };

  if (!orderItems || orderItems.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-tms-blue" />
          Order Items ({orderItems.length})
          <Badge variant="outline" className="ml-auto">
            {scannedItems.size} / {orderItems.length} scanned
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orderItems.map((orderItem) => {
            const itemDetails = getItemDetails(orderItem.itemId);
            const scannedQty = scannedQuantities[orderItem.itemId] || 0;
            const isFullyScanned = isItemFullyScanned(orderItem.itemId, orderItem.quantity);
            
            return (
              <div
                key={orderItem.itemId}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  isFullyScanned 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => handleItemClick(orderItem.itemId, orderItem.quantity)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isFullyScanned}
                    onChange={() => {
                      if (isFullyScanned) {
                        handleItemUncheck(orderItem.itemId);
                      }
                    }}
                    className="pointer-events-none"
                  />
                  <div>
                    <div className="font-medium">
                      {itemDetails?.name || orderItem.name || `Item ${orderItem.itemId}`}
                    </div>
                    {itemDetails?.sku && (
                      <div className="text-sm text-muted-foreground">
                        SKU: {itemDetails.sku}
                      </div>
                    )}
                    {itemDetails && (
                      <div className="text-xs text-muted-foreground">
                        {itemDetails.length}" × {itemDetails.width}" × {itemDetails.height}" • {itemDetails.weight} lbs
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isFullyScanned ? "default" : "secondary"}>
                    {scannedQty} / {orderItem.quantity}
                  </Badge>
                  {isFullyScanned && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {scannedItems.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Package className="h-4 w-4" />
              <span className="font-medium">
                {scannedItems.size} of {orderItems.length} items scanned and ready for packaging
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
