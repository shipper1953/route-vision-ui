
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { CartonizationEngine, CartonizationResult, Box, Item } from "@/services/cartonization/cartonizationEngine";

interface CartonizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  availableBoxes: Box[];
  onSelectBox: (box: Box) => void;
}

export const CartonizationDialog = ({ 
  isOpen, 
  onClose, 
  items, 
  availableBoxes, 
  onSelectBox 
}: CartonizationDialogProps) => {
  const [result, setResult] = useState<CartonizationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      setLoading(true);
      const engine = new CartonizationEngine(availableBoxes);
      const cartonizationResult = engine.calculateOptimalBox(items);
      setResult(cartonizationResult);
      setLoading(false);
    }
  }, [isOpen, items, availableBoxes]);

  const handleSelectBox = (box: Box) => {
    onSelectBox(box);
    onClose();
  };

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-tms-blue" />
            Cartonization Recommendations
          </DialogTitle>
          <DialogDescription>
            AI-powered packaging optimization for your shipment
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-blue"></div>
          </div>
        )}

        {!loading && !result && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No suitable boxes found for these items. Please check your inventory or item dimensions.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Recommended Box */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  Recommended Box
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-lg">{result.recommendedBox.name}</h4>
                    <p className="text-muted-foreground">
                      Dimensions: {formatDimensions(result.recommendedBox)}
                    </p>
                    <p className="text-muted-foreground">
                      Max Weight: {result.recommendedBox.maxWeight} lbs
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        {result.recommendedBox.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {result.recommendedBox.inStock} in stock
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Space Utilization:</span>
                      <span className={`font-semibold ${getUtilizationColor(result.utilization)}`}>
                        {result.utilization.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Weight:</span>
                      <span className="font-semibold">{result.totalWeight.toFixed(1)} lbs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost:</span>
                      <span className="font-semibold">${result.recommendedBox.cost.toFixed(2)}</span>
                    </div>
                    {result.savings > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          Savings:
                        </span>
                        <span className="font-semibold">${result.savings.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => handleSelectBox(result.recommendedBox)}
                  className="w-full mt-4"
                  variant="default"
                >
                  Use This Box
                </Button>
              </CardContent>
            </Card>

            {/* Alternative Options */}
            {result.alternatives.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Alternative Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.alternatives.map((alt, index) => (
                    <Card key={alt.box.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <h4 className="font-semibold">{alt.box.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {formatDimensions(alt.box)}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Utilization:</span>
                            <span className={getUtilizationColor(alt.utilization)}>
                              {alt.utilization.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cost:</span>
                            <span>${alt.cost.toFixed(2)}</span>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleSelectBox(alt.box)}
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                        >
                          Select
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
