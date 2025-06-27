import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Package, Plus, AlertCircle } from "lucide-react";
import { useBoxOrderStats } from "@/hooks/useBoxOrderStats";
import { fetchOrders } from "@/services/orderService";
import { useCartonization } from "@/hooks/useCartonization";
import { CartonizationEngine, Box } from "@/services/cartonization/cartonizationEngine";

// Uline-style box catalog with ECT-32 equivalent options
const CATALOG_BOXES: Box[] = [
  { id: 'cat-1', name: 'Small Cube 6x4x4', length: 6, width: 4, height: 4, maxWeight: 15, cost: 1.25, inStock: 0, type: 'box' },
  { id: 'cat-2', name: 'Small Rectangle 8x6x4', length: 8, width: 6, height: 4, maxWeight: 20, cost: 1.50, inStock: 0, type: 'box' },
  { id: 'cat-3', name: 'Medium Square 10x10x6', length: 10, width: 10, height: 6, maxWeight: 30, cost: 2.25, inStock: 0, type: 'box' },
  { id: 'cat-4', name: 'Medium Rectangle 12x9x6', length: 12, width: 9, height: 6, maxWeight: 35, cost: 2.75, inStock: 0, type: 'box' },
  { id: 'cat-5', name: 'Large Square 12x12x8', length: 12, width: 12, height: 8, maxWeight: 45, cost: 3.50, inStock: 0, type: 'box' },
  { id: 'cat-6', name: 'Large Rectangle 15x12x8', length: 15, width: 12, height: 8, maxWeight: 50, cost: 4.00, inStock: 0, type: 'box' },
  { id: 'cat-7', name: 'XL Rectangle 18x14x10', length: 18, width: 14, height: 10, maxWeight: 60, cost: 5.25, inStock: 0, type: 'box' },
  { id: 'cat-8', name: 'XXL Rectangle 20x16x12', length: 20, width: 16, height: 12, maxWeight: 70, cost: 6.50, inStock: 0, type: 'box' },
  { id: 'cat-9', name: 'Small Poly Mailer 9x6x2', length: 9, width: 6, height: 2, maxWeight: 8, cost: 0.65, inStock: 0, type: 'poly_bag' },
  { id: 'cat-10', name: 'Medium Poly Mailer 12x9x3', length: 12, width: 9, height: 3, maxWeight: 12, cost: 0.85, inStock: 0, type: 'poly_bag' },
  { id: 'cat-11', name: 'Large Poly Mailer 14x11x4', length: 14, width: 11, height: 4, maxWeight: 18, cost: 1.15, inStock: 0, type: 'poly_bag' },
  { id: 'cat-12', name: 'XL Poly Mailer 16x12x4', length: 16, width: 12, height: 4, maxWeight: 20, cost: 1.35, inStock: 0, type: 'poly_bag' }
];

interface BoxRecommendation {
  box: Box;
  potentialOrders: number;
  currentSuboptimalCost: number;
  projectedSavings: number;
  efficiencyGain: number;
  confidence: number;
  reasoning: string[];
}

export const BoxRecommendations = () => {
  const [recommendations, setRecommendations] = useState<BoxRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { boxes, createItemsFromOrderData, parameters } = useCartonization();

  useEffect(() => {
    const analyzeBoxRecommendations = async () => {
      try {
        setLoading(true);
        const orders = await fetchOrders();
        
        // Filter for recent orders that need better packaging - fix the type checking here
        const recentOrders = orders.filter(order => 
          (order.status === 'ready_to_ship' || order.status === 'processing') &&
          order.items && Array.isArray(order.items) && order.items.length > 0
        );

        if (recentOrders.length === 0) {
          setRecommendations([]);
          return;
        }

        const currentEngine = new CartonizationEngine(boxes, parameters);
        const catalogEngine = new CartonizationEngine([...boxes, ...CATALOG_BOXES], parameters);
        
        const boxAnalysis = new Map<string, {
          orders: string[],
          currentCost: number,
          catalogCost: number,
          efficiencyImprovement: number,
          reasoning: string[]
        }>();

        // Analyze each order
        for (const order of recentOrders) {
          // Ensure items is an array before processing
          if (!Array.isArray(order.items)) {
            continue;
          }
          
          const items = createItemsFromOrderData(order.items, []);
          if (items.length === 0) continue;

          // Get current best recommendation
          const currentResult = currentEngine.calculateOptimalBox(items);
          
          // Get catalog recommendation
          const catalogResult = catalogEngine.calculateOptimalBox(items);

          if (currentResult && catalogResult && catalogResult.recommendedBox.id.startsWith('cat-')) {
            const catalogBoxId = catalogResult.recommendedBox.id;
            
            if (!boxAnalysis.has(catalogBoxId)) {
              boxAnalysis.set(catalogBoxId, {
                orders: [],
                currentCost: 0,
                catalogCost: 0,
                efficiencyImprovement: 0,
                reasoning: []
              });
            }

            const analysis = boxAnalysis.get(catalogBoxId)!;
            analysis.orders.push(order.id);
            analysis.currentCost += currentResult.recommendedBox.cost;
            analysis.catalogCost += catalogResult.recommendedBox.cost;

            // Calculate efficiency improvement
            const currentUtilization = currentResult.utilization;
            const catalogUtilization = catalogResult.utilization;
            const efficiencyGain = catalogUtilization - currentUtilization;
            
            if (efficiencyGain > 0) {
              analysis.efficiencyImprovement += efficiencyGain;
              
              // Add reasoning
              if (efficiencyGain > 10) {
                analysis.reasoning.push(`${efficiencyGain.toFixed(1)}% better space utilization`);
              }
              if (catalogResult.recommendedBox.cost < currentResult.recommendedBox.cost) {
                const savings = currentResult.recommendedBox.cost - catalogResult.recommendedBox.cost;
                analysis.reasoning.push(`$${savings.toFixed(2)} cost savings per order`);
              }
              if (catalogResult.confidence > currentResult.confidence) {
                analysis.reasoning.push(`${(catalogResult.confidence - currentResult.confidence).toFixed(0)} points higher confidence`);
              }
            }
          }
        }

        // Convert to recommendations and sort by impact
        const recs: BoxRecommendation[] = [];
        
        for (const [boxId, analysis] of boxAnalysis.entries()) {
          const catalogBox = CATALOG_BOXES.find(b => b.id === boxId);
          if (!catalogBox || analysis.orders.length === 0) continue;

          const avgEfficiencyGain = analysis.efficiencyImprovement / analysis.orders.length;
          const totalSavings = analysis.currentCost - analysis.catalogCost;
          
          // Only recommend if there's meaningful improvement
          if (avgEfficiencyGain > 5 || totalSavings > 0) {
            const uniqueReasons = [...new Set(analysis.reasoning)];
            
            recs.push({
              box: catalogBox,
              potentialOrders: analysis.orders.length,
              currentSuboptimalCost: analysis.currentCost,
              projectedSavings: Math.max(0, totalSavings),
              efficiencyGain: avgEfficiencyGain,
              confidence: Math.min(100, 60 + (avgEfficiencyGain * 2) + (totalSavings > 0 ? 20 : 0)),
              reasoning: uniqueReasons.slice(0, 3) // Top 3 reasons
            });
          }
        }

        // Sort by combined impact score
        recs.sort((a, b) => {
          const aScore = (a.potentialOrders * 0.3) + (a.projectedSavings * 0.4) + (a.efficiencyGain * 0.3);
          const bScore = (b.potentialOrders * 0.3) + (b.projectedSavings * 0.4) + (b.efficiencyGain * 0.3);
          return bScore - aScore;
        });

        setRecommendations(recs.slice(0, 5)); // Top 5 recommendations
      } catch (error) {
        console.error('Error analyzing box recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    analyzeBoxRecommendations();
  }, [boxes, parameters]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-tms-blue" />
            Box Inventory Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing your orders to find optimal box recommendations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-tms-blue" />
        <h2 className="text-xl font-semibold">Top 5 Box Recommendations</h2>
      </div>

      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p>
            Based on your recent orders, these boxes would provide better fit and cost efficiency than your current inventory. 
            Recommendations are based on Uline ECT-32 equivalent catalog options.
          </p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
            <p className="text-muted-foreground">
              Your current box inventory appears to be well-optimized for your recent orders.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <Card key={rec.box.id} className="border-l-4 border-l-tms-blue">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      #{index + 1} - {rec.box.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {rec.box.length}" × {rec.box.width}" × {rec.box.height}" • Max {rec.box.maxWeight} lbs
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {rec.box.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Potential Orders</p>
                    <p className="text-2xl font-bold text-tms-blue">{rec.potentialOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cost Per Box</p>
                    <p className="text-2xl font-bold">${rec.box.cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Projected Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${rec.projectedSavings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Efficiency Gain</p>
                    <p className="text-2xl font-bold text-blue-600">
                      +{rec.efficiencyGain.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Recommendation Confidence</span>
                    <span className="text-sm text-muted-foreground">{rec.confidence.toFixed(0)}%</span>
                  </div>
                  <Progress value={rec.confidence} className="h-2" />
                </div>

                {rec.reasoning.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Key Benefits:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {rec.reasoning.map((reason, idx) => (
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
          ))}
        </div>
      )}
    </div>
  );
};
