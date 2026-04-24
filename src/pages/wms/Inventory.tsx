import { useState, useEffect } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { InventoryList } from "@/components/wms/inventory/InventoryList";
import { InventoryItemDialog } from "@/components/wms/inventory/InventoryItemDialog";
import { Search, Plus, RefreshCw } from "lucide-react";
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

  useEffect(() => {
    const custId = customerFilter === 'all' ? undefined : customerFilter;
    fetchInventory(undefined, custId);
  }, [customerFilter]);

  const filteredInventory = inventory.filter(item =>
    item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.item_sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustDialogOpen(true);
  };

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">
              Track and manage inventory levels across locations
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fetchInventory(undefined, customerFilter === 'all' ? undefined : customerFilter)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => {
              setSelectedItem(null);
              setAdjustDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Adjust Inventory
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item name, SKU, location, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && inventory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading inventory...
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No inventory found
          </div>
        ) : (
          <InventoryList
            inventory={filteredInventory}
            onSelectItem={handleSelectItem}
          />
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
