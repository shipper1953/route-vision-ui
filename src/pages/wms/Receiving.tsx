import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Plus, Scan, CheckCircle, AlertCircle, ClipboardList, Truck } from "lucide-react";
import { useWmsReceiving } from "@/hooks/useWmsReceiving";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Receiving() {
  const { toast } = useToast();
  const { purchaseOrders, loading, startReceiving } = useWmsReceiving();
  const [selectedPo, setSelectedPo] = useState<string | null>(null);
  const [scannedSku, setScannedSku] = useState("");
  const [quantity, setQuantity] = useState(1);

  const handleStartSession = async (poId: string) => {
    setSelectedPo(poId);
    toast({
      title: "Receiving Session Started",
      description: "Scan items to receive them into inventory",
    });
  };

  const handleScanItem = async () => {
    if (!scannedSku || !selectedPo) return;

    await startReceiving({
      poId: selectedPo,
      sku: scannedSku,
      quantity,
      condition: "good",
    });

    toast({
      title: "Item Received",
      description: `${quantity}x ${scannedSku} added to receiving`,
    });

    setScannedSku("");
    setQuantity(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'partially_received': return 'bg-blue-500';
      case 'received': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Receiving</h1>
            <p className="text-muted-foreground">Manage inbound shipments and purchase orders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <ClipboardList className="mr-2 h-4 w-4" />
              View All POs
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create PO
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending POs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Expected this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Currently receiving</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Received Today</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">487</div>
              <p className="text-xs text-muted-foreground">Items received</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Purchase Orders</CardTitle>
            <CardDescription>Purchase orders awaiting receipt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : purchaseOrders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending purchase orders</p>
              ) : (
                purchaseOrders.map((po: any) => (
                <div key={po.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{po.po_number}</span>
                      <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{po.vendor_name}</p>
                    <p className="text-xs text-muted-foreground">Expected: {po.expected_date}</p>
                  </div>
                  <Button onClick={() => handleStartSession(po.id)}>Start Receiving</Button>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TmsLayout>
  );
}
