import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, Truck, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Receiving() {
  // Mock data - will be replaced with real data from Supabase
  const pendingPOs = [
    { id: 1, poNumber: "PO-12345", vendor: "Acme Corp", expectedDate: "2024-10-27", items: 24, status: "pending" },
    { id: 2, poNumber: "PO-12346", vendor: "Global Supplies", expectedDate: "2024-10-28", items: 18, status: "pending" },
    { id: 3, poNumber: "PO-12347", vendor: "Metro Wholesale", expectedDate: "2024-10-29", items: 32, status: "pending" },
  ];

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
              {pendingPOs.map((po) => (
                <div key={po.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{po.poNumber}</span>
                      <Badge variant="outline">{po.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{po.vendor}</p>
                    <p className="text-xs text-muted-foreground">Expected: {po.expectedDate}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{po.items} items</p>
                    </div>
                    <Button>Start Receiving</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TmsLayout>
  );
}
