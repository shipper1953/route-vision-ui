
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle } from "lucide-react";
import { Box } from "@/services/cartonization/cartonizationEngine";

interface RecommendedBoxDisplayProps {
  recommendedBox: Box | null;
  utilization?: number;
  onUseBox?: (box: Box) => void;
}

export const RecommendedBoxDisplay = ({ 
  recommendedBox, 
  utilization, 
  onUseBox 
}: RecommendedBoxDisplayProps) => {
  if (!recommendedBox) {
    return null;
  }

  const formatDimensions = (box: Box) => {
    return `${box.length}" × ${box.width}" × ${box.height}"`;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 95) return "text-red-600";
    if (utilization > 80) return "text-green-600";
    if (utilization > 60) return "text-yellow-600";
    return "text-gray-600";
  };

  return (
    <Card className="border-green-200 bg-green-50 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          Recommended Box
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-lg">{recommendedBox.name}</h4>
            <p className="text-muted-foreground">
              Dimensions: {formatDimensions(recommendedBox)}
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
            </div>
          </div>
          <div className="space-y-2">
            {utilization && (
              <div className="flex justify-between">
                <span>Space Utilization:</span>
                <span className={`font-semibold ${getUtilizationColor(utilization)}`}>
                  {utilization.toFixed(1)}%
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Cost:</span>
              <span className="font-semibold">${recommendedBox.cost.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {onUseBox && (
          <Button 
            onClick={() => onUseBox(recommendedBox)}
            className="w-full mt-4"
            variant="default"
          >
            Use This Box
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
