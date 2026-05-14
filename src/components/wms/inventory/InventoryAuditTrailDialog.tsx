import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem } from "@/hooks/useInventory";
import { ArrowDown, ArrowUp, History, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: InventoryItem | null;
}

interface Tx {
  id: string;
  transaction_type: string;
  quantity_change: number;
  quantity_on_hand_before: number | null;
  quantity_on_hand_after: number | null;
  quantity_allocated_before: number | null;
  quantity_allocated_after: number | null;
  reason_code: string | null;
  notes: string | null;
  source: string | null;
  performed_by: string | null;
  lot_number: string | null;
  serial_number: string | null;
  created_at: string;
}

const typeColor = (t: string) => {
  if (t.includes('increase') || t === 'receive') return 'bg-green-500/10 text-green-600';
  if (t.includes('decrease') || t === 'ship') return 'bg-red-500/10 text-red-600';
  if (t === 'allocate') return 'bg-blue-500/10 text-blue-600';
  if (t === 'deallocate') return 'bg-amber-500/10 text-amber-600';
  return 'bg-muted text-muted-foreground';
};

export const InventoryAuditTrailDialog = ({ open, onOpenChange, item }: Props) => {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('inventory_transactions' as any)
        .select('*')
        .eq('inventory_level_id', item.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!error && data) setTxs(data as unknown as Tx[]);
      setLoading(false);
    })();
  }, [open, item]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Trail
          </DialogTitle>
          <DialogDescription>
            {item?.item_name} <span className="text-xs">({item?.item_sku})</span> · {item?.location_name}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading history…
          </div>
        ) : txs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No quantity changes recorded yet for this inventory record.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-2">
              {txs.map((tx) => {
                const positive = tx.quantity_change > 0;
                return (
                  <div key={tx.id} className="border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={typeColor(tx.transaction_type)}>
                            {tx.transaction_type.replace(/_/g, ' ')}
                          </Badge>
                          {tx.reason_code && (
                            <Badge variant="outline" className="text-xs">{tx.reason_code}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          On hand: {tx.quantity_on_hand_before ?? '–'} → {tx.quantity_on_hand_after ?? '–'}
                          {(tx.quantity_allocated_before !== null || tx.quantity_allocated_after !== null) && (
                            <span className="ml-3">
                              Allocated: {tx.quantity_allocated_before ?? '–'} → {tx.quantity_allocated_after ?? '–'}
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <div className="text-xs italic text-muted-foreground">"{tx.notes}"</div>
                        )}
                        {(tx.lot_number || tx.serial_number) && (
                          <div className="text-xs text-muted-foreground">
                            {tx.lot_number && <>Lot: {tx.lot_number} </>}
                            {tx.serial_number && <>SN: {tx.serial_number}</>}
                          </div>
                        )}
                        {tx.source && (
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                            source: {tx.source}
                          </div>
                        )}
                      </div>
                      <div className={`text-right font-bold text-lg flex items-center gap-1 ${positive ? 'text-green-600' : tx.quantity_change < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {tx.quantity_change !== 0 && (positive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
                        {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
