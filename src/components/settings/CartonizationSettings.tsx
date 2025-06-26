
import { useCartonization } from "@/hooks/useCartonization";
import { useBoxOrderStats } from "@/hooks/useBoxOrderStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const CartonizationSettings = () => {
  const { boxStats, loading } = useBoxOrderStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Box Demand Ranking
          </CardTitle>
          <CardDescription>
            Boxes ranked by number of open orders recommending their use
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
                  <div key={boxStat.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
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
                    <div className="text-right">
                      <div className="text-2xl font-bold text-tms-blue">
                        {boxStat.recommendedOrderCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {boxStat.recommendedOrderCount === 1 ? 'order' : 'orders'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
