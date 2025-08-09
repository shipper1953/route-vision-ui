import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { MultiPackageCartonizationResult, PackageRecommendation } from '@/services/cartonization/types';

interface EditPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageIndex: number;
  pkg: PackageRecommendation;
  multiPackageResult: MultiPackageCartonizationResult;
  onSave: (assignedItems: any[]) => void;
}

export const EditPackageDialog: React.FC<EditPackageDialogProps> = ({
  open,
  onOpenChange,
  packageIndex,
  pkg,
  multiPackageResult,
  onSave,
}) => {
  type ItemKey = string;

  // Build a canonical map of all items across packages
  const { itemTemplates, totalsByKey, otherUsageByKey, currentByKey } = useMemo(() => {
    const itemTemplates = new Map<ItemKey, any>();
    const totalsByKey = new Map<ItemKey, number>();
    const otherUsageByKey = new Map<ItemKey, number>();
    const currentByKey = new Map<ItemKey, number>();

    const makeKey = (it: any): ItemKey =>
      (it.id || it.itemId || it.sku || it.name) + `-${it.length ?? it.dimensions?.length ?? ''}x${it.width ?? it.dimensions?.width ?? ''}x${it.height ?? it.dimensions?.height ?? ''}`;

    multiPackageResult.packages.forEach((p, idx) => {
      p.assignedItems.forEach((it: any) => {
        const key = makeKey(it);
        if (!itemTemplates.has(key)) itemTemplates.set(key, it);
        totalsByKey.set(key, (totalsByKey.get(key) || 0) + Number(it.quantity || 1));
        if (idx === packageIndex) {
          currentByKey.set(key, (currentByKey.get(key) || 0) + Number(it.quantity || 1));
        } else {
          otherUsageByKey.set(key, (otherUsageByKey.get(key) || 0) + Number(it.quantity || 1));
        }
      });
    });

    return { itemTemplates, totalsByKey, otherUsageByKey, currentByKey };
  }, [multiPackageResult, packageIndex]);

  // Local editable quantities for this package
  const [quantities, setQuantities] = useState<Record<ItemKey, number>>(() => {
    const initial: Record<ItemKey, number> = {};
    currentByKey.forEach((qty, key) => {
      initial[key] = qty;
    });
    // Ensure all keys exist
    totalsByKey.forEach((_t, key) => {
      if (!(key in initial)) initial[key] = 0;
    });
    return initial;
  });

  const rows = useMemo(() => {
    const entries: Array<{
      key: ItemKey;
      name: string;
      max: number;
      current: number;
    }> = [];

    totalsByKey.forEach((total, key) => {
      const usedElsewhere = otherUsageByKey.get(key) || 0;
      const max = Math.max(0, total - usedElsewhere);
      const template = itemTemplates.get(key) || {};
      const name = template.name || template.sku || 'Item';
      entries.push({ key, name, max, current: quantities[key] ?? 0 });
    });

    // Sort for stable UI
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }, [totalsByKey, otherUsageByKey, itemTemplates, quantities]);

  const handleChange = (key: ItemKey, value: number, max: number) => {
    const v = Math.max(0, Math.min(max, Math.floor(value)));
    setQuantities((prev) => ({ ...prev, [key]: v }));
  };

  const handleSave = () => {
    // Build assignedItems for this package from templates and selected quantities
    const updated: any[] = [];
    rows.forEach(({ key, current }) => {
      if (current > 0) {
        const t = itemTemplates.get(key) || {};
        updated.push({
          ...t,
          quantity: current,
        });
      }
    });
    onSave(updated);
    onOpenChange(false);
  };

  const totalSelected = rows.reduce((sum, r) => sum + r.current, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Package {packageIndex + 1} Items</DialogTitle>
          <DialogDescription>
            Assign quantities to this package. Totals across packages are enforced.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Box: {pkg.box.name} • {pkg.box.length}" × {pkg.box.width}" × {pkg.box.height}"
          </div>

          <Separator />

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {rows.map((row) => (
              <div key={row.key} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-7 truncate" title={row.name}>
                  <Label className="font-medium">{row.name}</Label>
                </div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  Max: {row.max}
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={0}
                    max={row.max}
                    value={row.current}
                    onChange={(e) => handleChange(row.key, Number(e.target.value || 0), row.max)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total items in this package</span>
            <span className="font-medium">{totalSelected}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
