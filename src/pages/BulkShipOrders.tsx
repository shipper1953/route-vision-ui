import { TmsLayout } from "@/components/layout/TmsLayout";
import { useBulkShipping } from "@/hooks/useBulkShipping";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkShipOrdersTable } from "@/components/cartonization/BulkShipOrdersTable";

const BulkShipOrders = () => {
  const { boxShippingGroups, loading, handleFetchRates, handleBulkShip, refreshShippingGroups } = useBulkShipping();

  return (
    <TmsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-tms-blue flex items-center gap-2">
            <Ship className="h-6 w-6" />
            Bulk Ship Orders
          </h1>
          <p className="text-muted-foreground mt-1">
            Select and ship multiple orders that use the same recommended box size and shipping service
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {boxShippingGroups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Ship className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Ready for Bulk Shipping</h3>
                  <p className="text-muted-foreground">
                    There are currently no orders that can be grouped by box size for bulk shipping.
                  </p>
                </CardContent>
              </Card>
            ) : (
              boxShippingGroups.map((group) => (
                <BulkShipOrdersTable
                  key={group.box.id}
                  boxName={group.box.name}
                  boxDimensions={`${group.box.length}" × ${group.box.width}" × ${group.box.height}"`}
                  orders={group.orders}
                  onFetchRates={handleFetchRates}
                  onBulkShip={handleBulkShip}
                  onRefresh={refreshShippingGroups}
                />
              ))
            )}
          </div>
        )}
      </div>
    </TmsLayout>
  );
};

export default BulkShipOrders;
