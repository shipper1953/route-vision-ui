import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Warehouse, Search, Plus, TrendingUp, AlertTriangle, Package } from "lucide-react";

export default function Inventory() {
  const inventoryItems = [
    { id: 1, sku: "SKU-12345", name: "Widget A", location: "A-01-02-B", onHand: 450, allocated: 120, available: 330 },
    { id: 2, sku: "SKU-67890", name: "Gadget B", location: "B-03-01-A", onHand: 230, allocated: 80, available: 150 },
    { id: 3, sku: "SKU-11223", name: "Tool C", location: "C-02-04-C", onHand: 15, allocated: 10, available: 5 },
  ];

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground">Track stock levels and locations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Adjustment
            </Button>
            <Button variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Transfer
            </Button>
            <Button>
              <Warehouse className="mr-2 h-4 w-4" />
              Cycle Count
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,243</div>
              <p className="text-xs text-muted-foreground">Active items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45,892</div>
              <p className="text-xs text-muted-foreground">On hand</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">Items below threshold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Turnover</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.2x</div>
              <p className="text-xs text-muted-foreground">Annual rate</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Stock Levels</CardTitle>
                <CardDescription>Current inventory by location</CardDescription>
              </div>
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input type="text" placeholder="Search SKU or location..." />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventoryItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.sku}</span>
                      {item.available < 10 && (
                        <Badge variant="destructive">Low Stock</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Location: {item.location}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">On Hand</p>
                        <p className="text-sm font-medium">{item.onHand}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Allocated</p>
                        <p className="text-sm font-medium">{item.allocated}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Available</p>
                        <p className="text-sm font-bold">{item.available}</p>
                      </div>
                    </div>
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
