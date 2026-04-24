
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Package } from "lucide-react";
import { format } from "date-fns";
import { OrderData } from "@/types/orderTypes";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface OrderInfoCardProps {
  order: OrderData;
}

interface ItemDims {
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
}

export const OrderInfoCard = ({ order }: OrderInfoCardProps) => {
  const [itemDimsBySku, setItemDimsBySku] = useState<Record<string, ItemDims>>({});
  const [itemDimsById, setItemDimsById] = useState<Record<string, ItemDims>>({});

  // Collect SKUs/item IDs we need to look up from the items table.
  const lookupKeys = useMemo(() => {
    const skus = new Set<string>();
    const ids = new Set<string>();
    if (Array.isArray(order.items)) {
      order.items.forEach((it: any) => {
        if (it?.sku) skus.add(String(it.sku).trim());
        if (it?.itemId) ids.add(String(it.itemId));
      });
    }
    return { skus: Array.from(skus), ids: Array.from(ids) };
  }, [order.items]);

  // Always pull dims from the `items` (Item Master) table — never from Shopify payload.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (lookupKeys.skus.length === 0 && lookupKeys.ids.length === 0) {
        setItemDimsBySku({});
        setItemDimsById({});
        return;
      }
      const queries: Promise<any>[] = [];
      if (lookupKeys.skus.length > 0) {
        queries.push(
          supabase
            .from('items')
            .select('id, sku, length, width, height, weight')
            .in('sku', lookupKeys.skus),
        );
      }
      if (lookupKeys.ids.length > 0) {
        queries.push(
          supabase
            .from('items')
            .select('id, sku, length, width, height, weight')
            .in('id', lookupKeys.ids),
        );
      }
      const results = await Promise.all(queries);
      if (cancelled) return;
      const bySku: Record<string, ItemDims> = {};
      const byId: Record<string, ItemDims> = {};
      results.forEach((r) => {
        (r?.data || []).forEach((row: any) => {
          const dims: ItemDims = {
            length: row.length ?? null,
            width: row.width ?? null,
            height: row.height ?? null,
            weight: row.weight ?? null,
          };
          if (row.sku) bySku[String(row.sku).trim().toLowerCase()] = dims;
          if (row.id) byId[String(row.id)] = dims;
        });
      });
      setItemDimsBySku(bySku);
      setItemDimsById(byId);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [lookupKeys.skus.join('|'), lookupKeys.ids.join('|')]);

  const getDimsForItem = (item: any): ItemDims | null => {
    const sku = item?.sku ? String(item.sku).trim().toLowerCase() : '';
    if (sku && itemDimsBySku[sku]) return itemDimsBySku[sku];
    if (item?.itemId && itemDimsById[String(item.itemId)]) return itemDimsById[String(item.itemId)];
    return null;
  };

  const formatDims = (d: ItemDims | null) => {
    if (!d) return null;
    const hasDims = d.length || d.width || d.height;
    const hasWeight = d.weight !== null && d.weight !== undefined;
    const dimsLabel = hasDims ? `${d.length ?? '?'}"×${d.width ?? '?'}"×${d.height ?? '?'}"` : null;
    const weightLabel = hasWeight ? `${d.weight} lbs` : null;
    return [dimsLabel, weightLabel].filter(Boolean).join(' • ') || null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Order Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.orderId && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Shopify Order Number</label>
            <p className="font-mono">{order.orderId}</p>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Order Date</label>
          <p>{format(new Date(order.orderDate), "MMM dd, yyyy")}</p>
        </div>
        {order.requiredDeliveryDate && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Required Delivery Date</label>
            <p>{format(new Date(order.requiredDeliveryDate), "MMM dd, yyyy")}</p>
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Order Value</label>
          <p className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            {order.value}
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
            <Package className="h-4 w-4" />
            Items ({Array.isArray(order.items) ? order.items.length : 0})
          </label>
          {Array.isArray(order.items) && order.items.length > 0 ? (
            <div className="space-y-2">
              {order.items.map((item, index) => {
                const dimsLabel = formatDims(getDimsForItem(item));
                return (
                  <div
                    key={index}
                    className={`flex justify-between items-start p-2 rounded-md border ${
                      item.item_master_match === false
                        ? 'bg-red-50 border-red-200'
                        : 'bg-muted/50 border-transparent'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${item.item_master_match === false ? 'text-red-700' : ''}`}>
                        {item.name || item.description || `Item ${index + 1}`}
                      </p>
                      {item.sku && (
                        <p className={`text-xs ${item.item_master_match === false ? 'text-red-600' : 'text-muted-foreground'}`}>
                          SKU: {item.sku}
                          {dimsLabel && <span> • {dimsLabel}</span>}
                        </p>
                      )}
                      {!item.sku && dimsLabel && (
                        <p className="text-xs text-muted-foreground">{dimsLabel}</p>
                      )}
                      {item.item_master_match === false && (
                        <p className="text-xs text-red-700 mt-1">
                          {item.item_master_error || 'Missing from Item Master. Run Shopify product sync.'}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <Badge variant={item.item_master_match === false ? 'destructive' : 'secondary'} className="text-xs">
                        Qty: {item.quantity || 1}
                      </Badge>
                      {item.unitPrice && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ${typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : item.unitPrice}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No items</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
