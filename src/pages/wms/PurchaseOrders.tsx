import { useMemo, useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PackageOpen, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePurchaseOrders, type PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { CreatePurchaseOrderDialog } from "@/components/wms/po/CreatePurchaseOrderDialog";
import { PurchaseOrdersList } from "@/components/wms/po/PurchaseOrdersList";
import { supabase } from "@/integrations/supabase/client";

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const { purchaseOrders, loading, createPurchaseOrder, cancelPurchaseOrder } = usePurchaseOrders();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

  const openPO = async (po: PurchaseOrder) => {
    const { data } = await supabase
      .from('purchase_orders' as any)
      .select('*, customers(*), po_line_items(*, items(*))')
      .eq('id', po.id)
      .single();

    setSelectedPO(data || po);
  };

  const lineCountLabel = useMemo(() => {
    return `${purchaseOrders.length} PO${purchaseOrders.length === 1 ? '' : 's'}`;
  }, [purchaseOrders.length]);

  return (
    <TmsLayout>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground mt-1">Create inbound POs by SKU/qty, then receive them.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/wms/receiving')}>
              <PackageOpen className="mr-2 h-4 w-4" />
              Start Receiving
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create PO
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{lineCountLabel}</Badge>
          <span>Use Create PO to enter SKUs and quantities before receiving.</span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading purchase orders...</p>
          </div>
        ) : (
          <PurchaseOrdersList
            purchaseOrders={purchaseOrders}
            onView={openPO}
            onCancel={cancelPurchaseOrder}
          />
        )}

        <CreatePurchaseOrderDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={createPurchaseOrder as any}
        />

        <Dialog open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedPO?.po_number} details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p><span className="font-medium">Vendor:</span> {selectedPO?.vendor_name || '-'}</p>
                <p><span className="font-medium">Status:</span> {selectedPO?.status}</p>
              </div>
              <div className="border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">SKU</th>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-right">Ordered</th>
                      <th className="p-2 text-right">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO?.po_line_items?.map((line: any) => (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="p-2">{line.items?.sku || line.sku}</td>
                        <td className="p-2">{line.items?.name || line.product_name}</td>
                        <td className="p-2 text-right">{line.quantity_ordered}</td>
                        <td className="p-2 text-right">{line.quantity_received || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => navigate('/wms/receiving')}>Receive this PO</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TmsLayout>
  );
};

export default PurchaseOrders;
