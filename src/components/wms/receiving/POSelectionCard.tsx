import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackageOpen, Calendar, Truck, Boxes, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface POSelectionCardProps {
  po: any;
  onStartReceiving: (poId: string, warehouseId: string) => void;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  partially_received: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
};

export const POSelectionCard = ({ po, onStartReceiving }: POSelectionCardProps) => {
  const lineItems = po.po_line_items || [];
  const totalOrdered = lineItems.reduce((sum: number, l: any) => sum + (l.quantity_ordered || 0), 0);
  const totalReceived = lineItems.reduce((sum: number, l: any) => sum + (l.quantity_received || 0), 0);
  const progress = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  const statusKey = (po.status || 'pending') as string;
  const previewItems = lineItems.slice(0, 3);
  const remainingCount = Math.max(lineItems.length - previewItems.length, 0);

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PO Number</p>
            <h3 className="text-lg font-semibold mt-0.5 truncate">{po.po_number}</h3>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {po.customers?.name || 'No customer assigned'}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 capitalize font-medium ${statusStyles[statusKey] || statusStyles.pending}`}
          >
            {statusKey.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Meta */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3 text-sm border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate" title={po.vendor_name || ''}>
            {po.vendor_name || 'No vendor'}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">
            {po.expected_date ? format(new Date(po.expected_date), 'MMM d, yyyy') : 'No ETA'}
          </span>
        </div>
        <div className="flex items-center gap-2 col-span-2">
          <Boxes className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>
            <span className="font-medium text-foreground">{lineItems.length}</span>
            <span className="text-muted-foreground"> {lineItems.length === 1 ? 'item' : 'items'} · </span>
            <span className="font-medium text-foreground">{totalReceived}</span>
            <span className="text-muted-foreground"> / {totalOrdered} units received</span>
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Receiving progress</span>
          <span className="font-semibold tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Item preview */}
      {previewItems.length > 0 && (
        <ul className="px-5 pt-4 space-y-1.5">
          {previewItems.map((line: any) => {
            const remaining = Math.max((line.quantity_ordered || 0) - (line.quantity_received || 0), 0);
            return (
              <li key={line.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground/90" title={line.items?.name || line.product_name}>
                  {line.items?.name || line.product_name}
                </span>
                <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
                  {remaining} left
                </span>
              </li>
            );
          })}
          {remainingCount > 0 && (
            <li className="text-xs text-muted-foreground pt-0.5">
              +{remainingCount} more {remainingCount === 1 ? 'item' : 'items'}
            </li>
          )}
        </ul>
      )}

      {/* CTA */}
      <div className="p-5 pt-4">
        <Button
          className="w-full group/btn"
          onClick={() => onStartReceiving(po.id, po.warehouse_id)}
        >
          <PackageOpen className="mr-2 h-4 w-4" />
          Start Receiving
          <ArrowRight className="ml-auto h-4 w-4 opacity-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
        </Button>
      </div>
    </Card>
  );
};
