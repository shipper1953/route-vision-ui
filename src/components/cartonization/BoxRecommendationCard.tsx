
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
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

interface BoxRecommendationCardProps {
  recommendation: BoxRecommendation;
  index: number;
}

export const BoxRecommendationCard = ({ recommendation, index }: BoxRecommendationCardProps) => {
  const { box } = recommendation;

  return (
    <Card className="border-l-4 border-l-tms-blue">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">
              #{index + 1} - {box.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {box.length}" × {box.width}" × {box.height}" • Max {box.maxWeight} lbs
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {box.type.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Potential Orders</p>
            <p className="text-2xl font-bold text-tms-blue">{recommendation.potentialOrders}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cost Per Box</p>
            <p className="text-2xl font-bold">${box.cost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Projected Savings</p>
            <p className="text-2xl font-bold text-green-600">
              ${recommendation.projectedSavings.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Efficiency Gain</p>
            <p className="text-2xl font-bold text-blue-600">
              +{recommendation.efficiencyGain.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Recommendation Confidence</span>
            <span className="text-sm text-muted-foreground">{recommendation.confidence.toFixed(0)}%</span>
          </div>
          <Progress value={recommendation.confidence} className="h-2" />
        </div>

        {recommendation.reasoning.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Key Benefits:</p>
            <ul className="list-disc list-inside space-y-1">
              {recommendation.reasoning.map((reason, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">{reason}</li>
              ))}
            </ul>
          </div>
        )}

        <Button className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add to Inventory
        </Button>
      </CardContent>
    </Card>
  );
};
