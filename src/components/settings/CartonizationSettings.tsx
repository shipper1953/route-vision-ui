
import { useState } from "react";
import { useCartonization } from "@/hooks/useCartonization";
import { useBoxOrderStats } from "@/hooks/useBoxOrderStats";
import { useBulkShipping } from "@/hooks/useBulkShipping";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ChevronDown, ChevronRight, Ship } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkShipOrdersTable } from "@/components/cartonization/BulkShipOrdersTable";

export const CartonizationSettings = () => {
  const { boxStats, loading } = useBoxOrderStats();
  const { boxShippingGroups, loading: bulkShippingLoading, handleBulkShip } = useBulkShipping();
  const [expandedBoxId, setExpandedBoxId] = useState<string | null>(null);
  const [showBulkShipping, setShowBulkShipping] = useState(false);

  const toggleExpanded = (boxId: string) => {
    setExpandedBoxId(expandedBoxId === boxId ? null : boxId);
  };

  return (
    <div className="space-y-6">
      {/* Toggle between Box Demand Ranking and Bulk Shipping */}
      <div className="flex items-center gap-4">
        <Button
          variant={!showBulkShipping ? "default" : "outline"}
          onClick={() => setShowBulkShipping(false)}
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Box Demand Ranking
        </Button>
        <Button
          variant={showBulkShipping ? "default" : "outline"}
          onClick={() => setShowBulkShipping(true)}
          className="gap-2"
        >
          <Ship className="h-4 w-4" />
          Bulk Ship by Box Size
        </Button>
      </div>

      {showBulkShipping ? (
        /* Bulk Shipping View */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5 text-tms-blue" />
                Bulk Ship Orders by Box Size
              </CardTitle>
              <CardDescription>
                Select and ship multiple orders that use the same recommended box size and shipping service.
              </CardDescription>
            </CardHeader>
          </Card>

          {bulkShippingLoading ? (
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
                  <CardContent className="text-center py-8">
                    <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                    onBulkShip={handleBulkShip}
                  />
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* Box Demand Ranking View */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Box Demand Ranking
            </CardTitle>
            <CardDescription>
              Boxes ranked by number of open orders recommending their use. Click on a box to see the recommended orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {boxStats.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No box inventory found. Add some boxes in the Box Inventory Management tab to get started.
                  </p>
                ) : (
                  boxStats.map((boxStat, index) => (
                    <div key={boxStat.id} className="border rounded-lg">
                      <div 
                        className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => toggleExpanded(boxStat.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 bg-tms-blue/10 rounded-lg">
                            <span className="text-tms-blue font-semibold">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold">{boxStat.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {boxStat.length}" × {boxStat.width}" × {boxStat.height}" • 
                              Max {boxStat.maxWeight} lbs • ${boxStat.cost.toFixed(2)}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary">
                                {boxStat.type.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge variant={boxStat.inStock > 0 ? "default" : "destructive"}>
                                {boxStat.inStock} in stock
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-tms-blue">
                              {boxStat.recommendedOrderCount}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {boxStat.recommendedOrderCount === 1 ? 'order' : 'orders'}
                            </div>
                          </div>
                          {boxStat.recommendedOrderCount > 0 && (
                            expandedBoxId === boxStat.id ? 
                              <ChevronDown className="h-5 w-5 text-muted-foreground" /> :
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {expandedBoxId === boxStat.id && boxStat.recommendedOrders.length > 0 && (
                        <div className="border-t bg-muted/10 p-4">
                          <h5 className="font-medium text-sm text-muted-foreground mb-3">
                            Recommended Orders ({boxStat.recommendedOrders.length})
                          </h5>
                          <div className="space-y-2">
                            {boxStat.recommendedOrders.map((orderId) => (
                              <div key={orderId} className="flex items-center gap-2 text-sm">
                                <Badge variant="outline" className="font-mono">
                                  {orderId}
                                </Badge>
                                <span className="text-muted-foreground">
                                  Order recommended for this box
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
