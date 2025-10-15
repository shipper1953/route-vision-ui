import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, TrendingUp } from 'lucide-react';
import { useDashboardBoxOpportunities } from '@/hooks/useDashboardBoxOpportunities';

export const BoxOpportunitiesCard = () => {
  const { opportunities, loading } = useDashboardBoxOpportunities();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Box Opportunities
          </CardTitle>
          <CardDescription>Loading opportunities...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Box Opportunities
          </CardTitle>
          <CardDescription>Optimal box sizes to improve utilization</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            No opportunities yet. Generate a packaging intelligence report to see recommendations.
          </p>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Link 
            to="/packaging?tab=recommendations" 
            className="text-sm text-primary hover:underline w-full text-center"
          >
            Go to Packaging Intelligence →
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const getPriorityBadge = (index: number) => {
    if (index === 0) return <Badge variant="destructive">HIGH</Badge>;
    if (index === 1) return <Badge className="bg-orange-500">MEDIUM</Badge>;
    return <Badge variant="secondary">LOW</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Box Opportunities
        </CardTitle>
        <CardDescription>
          Top 3 opportunities to optimize packaging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.map((opp, index) => (
          <div key={opp.master_box_sku} className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{index + 1}</Badge>
                <span className="font-medium text-sm">{opp.master_box_name}</span>
              </div>
              {getPriorityBadge(index)}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>SKU: {opp.master_box_sku}</div>
              <div className="flex justify-between items-center">
                <span>{opp.shipment_count} shipments</span>
                <span className="text-green-600 font-semibold">
                  ${opp.total_savings?.toFixed(2)} potential savings
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Link 
          to="/packaging?tab=box-recommendations" 
          className="text-sm text-primary hover:underline w-full text-center flex items-center justify-center gap-1"
        >
          View All Opportunities →
        </Link>
      </CardFooter>
    </Card>
  );
};
