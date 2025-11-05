import { useState } from "react";
import { usePurchaseOrders, PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { CreatePurchaseOrderDialog } from "@/components/wms/po/CreatePurchaseOrderDialog";
import { PurchaseOrdersList } from "@/components/wms/po/PurchaseOrdersList";
import { TmsLayout } from "@/components/layout/TmsLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PurchaseOrders = () => {
  const { 
    purchaseOrders, 
    loading, 
    createPurchaseOrder, 
    cancelPurchaseOrder,
    fetchPurchaseOrders 
  } = usePurchaseOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         po.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCancel = async (id: string) => {
    if (confirm('Are you sure you want to cancel this purchase order?')) {
      await cancelPurchaseOrder(id);
    }
  };

  return (
    <TmsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground mt-1">
              Manage inbound purchase orders
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create PO
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search POs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partially_received">Partially Received</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Purchase Orders List */}
        {loading && purchaseOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading purchase orders...</p>
          </div>
        ) : (
          <PurchaseOrdersList
            purchaseOrders={filteredPOs}
            onView={setSelectedPO}
            onCancel={handleCancel}
          />
        )}

        {/* Create Dialog */}
        <CreatePurchaseOrderDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={createPurchaseOrder}
        />
      </div>
    </TmsLayout>
  );
};

export default PurchaseOrders;
