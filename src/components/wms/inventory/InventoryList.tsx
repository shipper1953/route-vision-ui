import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryItem } from "@/hooks/useInventory";
import { Package, MapPin, Calendar, History, ChevronRight, User } from "lucide-react";
import { InventoryAuditTrailDialog } from "./InventoryAuditTrailDialog";

interface InventoryListProps {
  inventory: InventoryItem[];
  onSelectItem?: (item: InventoryItem) => void;
}

export const InventoryList = ({ inventory, onSelectItem }: InventoryListProps) => {
  const [auditItem, setAuditItem] = useState<InventoryItem | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const conditionStyles = (condition: string) => {
    switch (condition) {
      case 'good':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'damaged':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'expired':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-3">
      {inventory.map((item) => {
        const lowStock = item.quantity_available <= 5;
        return (
          <Card
            key={item.id}
            className="group relative overflow-hidden border border-border/60 bg-card p-0 shadow-sm transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
            onClick={() => onSelectItem?.(item)}
          >
            <div className="flex items-stretch">
              {/* Accent rail */}
              <div
                className={`w-1 shrink-0 ${
                  lowStock ? 'bg-amber-500' : 'bg-primary/70'
                } group-hover:bg-primary transition-colors`}
              />

              <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: identity */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {item.item_name || 'Unnamed item'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-mono">{item.item_sku || '—'}</span>
                        <Badge
                          variant="outline"
                          className={`ml-1 border text-[10px] font-medium uppercase tracking-wide ${conditionStyles(item.condition)}`}
                        >
                          {item.condition}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-11 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {item.location_name || 'No location'}
                    </span>
                    {item.customer_name && (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {item.customer_name}
                      </span>
                    )}
                    {item.lot_number && (
                      <span className="inline-flex items-center gap-1.5">
                        Lot <span className="font-mono text-foreground/80">{item.lot_number}</span>
                      </span>
                    )}
                    {item.expiry_date && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="pl-11">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAuditItem(item);
                        setAuditOpen(true);
                      }}
                    >
                      <History className="mr-1 h-3 w-3" />
                      Audit trail
                    </Button>
                  </div>
                </div>

                {/* Right: quantity summary */}
                <div className="flex shrink-0 items-center gap-4">
                  <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-center">
                    <div>
                      <div className={`text-2xl font-semibold leading-none ${lowStock ? 'text-amber-600' : 'text-foreground'}`}>
                        {item.quantity_available}
                      </div>
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Available
                      </div>
                    </div>
                    <div className="border-l border-border/60">
                      <div className="text-2xl font-semibold leading-none text-foreground/80">
                        {item.quantity_allocated}
                      </div>
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Allocated
                      </div>
                    </div>
                    <div className="border-l border-border/60">
                      <div className="text-2xl font-semibold leading-none text-foreground/80">
                        {item.quantity_on_hand}
                      </div>
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        On hand
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="hidden h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground sm:block" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <InventoryAuditTrailDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        item={auditItem}
      />
    </div>
  );
};
