import { useState, useEffect, useMemo } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { InventoryList } from "@/components/wms/inventory/InventoryList";
import { InventoryItemDialog } from "@/components/wms/inventory/InventoryItemDialog";
import { Search, Plus, RefreshCw, Wand2, Package, Boxes, Layers, AlertTriangle, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Inventory() {
  const { inventory, loading, fetchInventory, adjustInventory } = useInventory();
  const { userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReconcile = async () => {
    if (!confirm('Scan inventory for duplicate SKU rows and merge their quantities into a single entry per location/lot/serial? This cannot be undone.')) return;
    try {
      setReconciling(true);
      const { data, error } = await supabase.functions.invoke('wms-reconcile-inventory-duplicates', { body: {} });
      if (error) throw error;
      const merged = data?.mergedRows || 0;
      const groups = data?.duplicateGroups || 0;
      if (merged === 0) {
        toast.success('No duplicates found — inventory is clean.');
      } else {
        toast.success(`Merged ${merged} duplicate row(s) across ${groups} SKU group(s).`);
      }
      fetchInventory(undefined, customerFilter === 'all' ? undefined : customerFilter);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reconcile inventory');
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) {
      supabase
        .from('customers')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => setCustomers(data || []));
    }
  }, [userProfile?.company_id]);

  const refresh = async () => {
    setError(null);
    try {
      await fetchInventory(undefined, customerFilter === 'all' ? undefined : customerFilter);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inventory');
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerFilter]);

  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) =>
        item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [inventory, searchQuery]
  );

  const summary = useMemo(() => {
    const skus = new Set(inventory.map((i) => i.item_sku || i.item_id)).size;
    const available = inventory.reduce((s, i) => s + (i.quantity_available || 0), 0);
    const allocated = inventory.reduce((s, i) => s + (i.quantity_allocated || 0), 0);
    const onHand = inventory.reduce((s, i) => s + (i.quantity_on_hand || 0), 0);
    const lowStock = inventory.filter((i) => (i.quantity_available || 0) <= 5).length;
    return { skus, available, allocated, onHand, lowStock };
  }, [inventory]);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustDialogOpen(true);
  };

  return (
    <TmsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Inventory</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track stock levels, conditions, and movement across every location.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleReconcile}
              disabled={reconciling}
              title="Find duplicate inventory rows for the same SKU/location/lot/serial and merge their quantities into one entry"
            >
              <Wand2 className={`h-4 w-4 mr-2 ${reconciling ? 'animate-pulse' : ''}`} />
              {reconciling ? 'Reconciling…' : 'Reconcile duplicates'}
            </Button>
            <Button
              onClick={() => {
                setSelectedItem(null);
                setAdjustDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adjust inventory
            </Button>
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile
            icon={<Boxes className="h-4 w-4" />}
            label="Unique SKUs"
            value={summary.skus.toLocaleString()}
            tone="primary"
          />
          <SummaryTile
            icon={<Package className="h-4 w-4" />}
            label="Available"
            value={summary.available.toLocaleString()}
            tone="emerald"
          />
          <SummaryTile
            icon={<Layers className="h-4 w-4" />}
            label="Allocated"
            value={summary.allocated.toLocaleString()}
            tone="muted"
            sublabel={`${summary.onHand.toLocaleString()} on hand`}
          />
          <SummaryTile
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Low stock"
            value={summary.lowStock.toLocaleString()}
            tone={summary.lowStock > 0 ? 'amber' : 'muted'}
            sublabel="≤ 5 available"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item name, SKU, location, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-full sm:w-[220px] bg-card">
              <SelectValue placeholder="All customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Body */}
        {loading && inventory.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[112px] w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            tone="error"
            icon={<AlertTriangle className="h-6 w-6" />}
            title="We couldn't load your inventory"
            description={error}
            action={<Button onClick={refresh}>Try again</Button>}
          />
        ) : filteredInventory.length === 0 ? (
          inventory.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="h-6 w-6" />}
              title="No inventory yet"
              description="Receive a purchase order or run an adjustment to start tracking stock here."
              action={
                <Button onClick={() => { setSelectedItem(null); setAdjustDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adjust inventory
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No matches"
              description="Try a different SKU, location, or clear the customer filter."
              action={
                <Button
                  variant="outline"
                  onClick={() => { setSearchQuery(''); setCustomerFilter('all'); }}
                >
                  Clear filters
                </Button>
              }
            />
          )
        ) : (
          <InventoryList inventory={filteredInventory} onSelectItem={handleSelectItem} />
        )}

        <InventoryItemDialog
          open={adjustDialogOpen}
          onOpenChange={setAdjustDialogOpen}
          onAdjust={adjustInventory}
          item={selectedItem}
        />
      </div>
    </TmsLayout>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  sublabel,
  tone = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  tone?: 'primary' | 'emerald' | 'amber' | 'muted';
}) {
  const toneMap = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    muted: 'bg-muted text-muted-foreground',
  } as const;

  return (
    <Card className="border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${toneMap[tone]}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>
      )}
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'default',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: 'default' | 'error';
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border border-dashed border-border/70 bg-card/50 px-6 py-16 text-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          tone === 'error' ? 'bg-rose-500/10 text-rose-600' : 'bg-muted text-muted-foreground'
        }`}
      >
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-base font-semibold text-foreground">{title}</div>
        <div className="max-w-md text-sm text-muted-foreground">{description}</div>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </Card>
  );
}
