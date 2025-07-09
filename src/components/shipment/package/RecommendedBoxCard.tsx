import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { CartonizationResult } from "@/services/cartonization/cartonizationEngine";

interface RecommendedBoxCardProps {
  recommendedBox: any;
  cartonizationResult: CartonizationResult;
  boxUtilization: number;
  onUseRecommendedBox: (box: any) => void;
}

export const RecommendedBoxCard = ({
  recommendedBox,
  cartonizationResult,
  boxUtilization,
  onUseRecommendedBox
}: RecommendedBoxCardProps) => {
  return (
    <Card className="border-green-200 bg-green-50 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          AI Recommended Package
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-lg">{recommendedBox.name}</h4>
            <p className="text-muted-foreground">
              Dimensions: {recommendedBox.length}" × {recommendedBox.width}" × {recommendedBox.height}"
            </p>
            <p className="text-muted-foreground">
              Max Weight: {recommendedBox.maxWeight} lbs
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {recommendedBox.type.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {recommendedBox.inStock} in stock
              </Badge>
              <Badge variant="default">
                {cartonizationResult.confidence}% confidence
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Space Utilization:</span>
              <span className={`font-semibold ${boxUtilization > 95 ? 'text-red-600' : boxUtilization > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                {boxUtilization.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Dimensional Weight:</span>
              <span className="font-semibold">{cartonizationResult.dimensionalWeight.toFixed(1)} lbs</span>
            </div>
            <div className="flex justify-between">
              <span>Cost:</span>
              <span className="font-semibold">${recommendedBox.cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Potential Savings:</span>
              <span className="font-semibold text-green-600">${cartonizationResult.savings.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h5 className="font-medium mb-2">Rules Applied:</h5>
          <div className="flex flex-wrap gap-1">
            {cartonizationResult.rulesApplied.map((rule, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {rule}
              </Badge>
            ))}
          </div>
        </div>

        <Button 
          onClick={() => onUseRecommendedBox(recommendedBox)}
          className="w-full mt-4"
          variant="default"
        >
          Use This Package
        </Button>
      </CardContent>
    </Card>
  );
};