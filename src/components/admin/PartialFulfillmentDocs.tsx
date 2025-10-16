import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen,
  Package, 
  ShoppingCart, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Database
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const PartialFulfillmentDocs = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Partial Fulfillment Guide
        </CardTitle>
        <CardDescription>
          Learn how to use the partial fulfillment features in Ship Tornado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="shopify">Shopify</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  What is Partial Fulfillment?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Partial fulfillment allows you to ship orders in multiple packages, tracking exactly which items 
                  are shipped in each package. This is useful for:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>Large orders that need multiple boxes</li>
                  <li>Items shipping from different warehouses</li>
                  <li>Backordered items shipping later</li>
                  <li>Split shipments to manage weight/size limits</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Key Features:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• Track items at the individual level per shipment</li>
                    <li>• See real-time fulfillment progress (0-100%)</li>
                    <li>• Prevent over-shipping with automatic validation</li>
                    <li>• Sync partial fulfillments to Shopify automatically</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div>
                <h3 className="font-semibold mb-2">Fulfillment Statuses</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Unfulfilled</Badge>
                    <span className="text-sm text-muted-foreground">No items shipped yet (0%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-blue-500">Partially Fulfilled</Badge>
                    <span className="text-sm text-muted-foreground">Some items shipped (1-99%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500">Fulfilled</Badge>
                    <span className="text-sm text-muted-foreground">All items shipped (100%)</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Creating Partial Shipments
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">Step 1: Start a Shipment</p>
                    <p>Go to Create Shipment and select or enter an order number</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">Step 2: Select Items</p>
                    <p>If the order has items, you'll see an item selector showing:</p>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Total quantity in order</li>
                      <li>Already shipped quantity</li>
                      <li>Available to ship (automatically calculated)</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-foreground mb-1">Step 3: Choose Quantities</p>
                    <p>
                      Select how many of each item to include in this shipment. The system prevents 
                      you from shipping more than available.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground mb-1">Step 4: Complete Shipment</p>
                    <p>
                      Get rates, select a carrier, and purchase the label. Items are automatically 
                      recorded in the database.
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Pro Tip:</strong> Use bulk shipping to create multiple shipments efficiently. 
                  Each order's items are automatically included when processing bulk shipments.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Viewing Fulfillment Status
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">Orders Table</p>
                    <p>See fulfillment badges showing unfulfilled, partially fulfilled, or fulfilled status</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">Order Details Page</p>
                    <p>View detailed breakdown including:</p>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Items shipped vs. total items</li>
                      <li>Fulfillment percentage</li>
                      <li>List of all shipments with items included</li>
                      <li>"Ship Remaining Items" button for partial orders</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-foreground mb-1">Shipments Table</p>
                    <p>
                      Each shipment row shows which items were included and package number 
                      for multi-package orders
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Multi-Package Orders</h3>
                <p className="text-sm text-muted-foreground">
                  When an order has multiple shipments, each is labeled with its package number 
                  (Pkg 1, Pkg 2, etc.). You can track exactly which items went in each package.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shopify" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Shopify Integration
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  When you connect Ship Tornado to Shopify, partial fulfillments are automatically 
                  synced to your Shopify store.
                </p>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground mb-1">Automatic Sync</p>
                    <p>After purchasing a shipping label, Ship Tornado:</p>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Sends only the shipped items to Shopify</li>
                      <li>Updates the fulfillment with tracking info</li>
                      <li>Marks only shipped quantities as fulfilled</li>
                      <li>Leaves remaining items as unfulfilled</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground mb-1">Multiple Shipments</p>
                    <p>
                      Each partial shipment creates a separate fulfillment in Shopify, so customers 
                      can track each package individually.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground mb-1">Customer Notifications</p>
                    <p>
                      Shopify automatically sends tracking emails to customers for each shipment, 
                      including which items are in that package.
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> Make sure your Shopify integration is connected in Company 
                  Admin settings before creating shipments for Shopify orders.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
