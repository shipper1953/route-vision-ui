
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";
import { BoxRecommendationCard } from "./BoxRecommendationCard";
import { Box } from "@/services/cartonization/cartonizationEngine";

interface BoxRecommendation {
  box: Box;
  potentialOrders: number;
  currentSuboptimalCost: number;
  projectedSavings: number;
  efficiencyGain: number;
  confidence: number;
  reasoning: string[];
}

interface BoxRecommendationsListProps {
  recommendations: BoxRecommendation[];
  loading: boolean;
}

export const BoxRecommendationsList = ({ recommendations, loading }: BoxRecommendationsListProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing your orders to find optimal box recommendations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
          <p className="text-muted-foreground">
            Your current box inventory appears to be well-optimized for your recent orders.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {recommendations.map((recommendation, index) => (
        <BoxRecommendationCard 
          key={recommendation.box.id} 
          recommendation={recommendation} 
          index={index} 
        />
      ))}
    </div>
  );
};
