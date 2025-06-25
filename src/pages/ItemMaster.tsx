
import { useState, useEffect } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ItemMasterTable } from "@/components/itemmaster/ItemMasterTable";
import { CreateItemDialog } from "@/components/itemmaster/CreateItemDialog";
import { useItemMaster } from "@/hooks/useItemMaster";

const ItemMaster = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { items, loading, createItem, updateItem, deleteItem } = useItemMaster();

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Item Master</h1>
          <p className="text-muted-foreground">Manage your product catalog with dimensions</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-tms-blue hover:bg-tms-blue-400"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items Catalog
              </CardTitle>
              <CardDescription>
                {loading ? "Loading items..." : `Showing ${filteredItems.length} of ${items.length} items`}
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ItemMasterTable
            items={filteredItems}
            loading={loading}
            onUpdate={updateItem}
            onDelete={deleteItem}
          />
        </CardContent>
      </Card>

      <CreateItemDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateItem={createItem}
      />
    </TmsLayout>
  );
};

export default ItemMaster;
