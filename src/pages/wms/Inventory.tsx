import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { InventoryList } from "@/components/wms/inventory/InventoryList";
import { AdjustInventoryDialog } from "@/components/wms/inventory/AdjustInventoryDialog";
import { Search, Plus, RefreshCw } from "lucide-react";

export default function Inventory() {
  const { inventory, loading, fetchInventory, adjustInventory } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const filteredInventory = inventory.filter(item =>
    item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.item_sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
              onClick={() => fetchInventory()}
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item name, SKU, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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

        <AdjustInventoryDialog
          open={adjustDialogOpen}
          onOpenChange={setAdjustDialogOpen}
          onAdjust={adjustInventory}
          itemId={selectedItem?.item_id}
          warehouseId={selectedItem?.warehouse_id}
          locationId={selectedItem?.location_id}
        />
      </div>
    </TmsLayout>
  );
}
