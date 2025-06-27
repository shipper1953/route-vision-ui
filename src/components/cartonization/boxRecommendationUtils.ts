
import { CartonizationEngine, Box } from "@/services/cartonization/cartonizationEngine";
import { fetchOrders } from "@/services/orderService";

// Uline-style box catalog with ECT-32 equivalent options
export const CATALOG_BOXES: Box[] = [
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

export interface BoxRecommendation {
  box: Box;
  potentialOrders: number;
  currentSuboptimalCost: number;
  projectedSavings: number;
  efficiencyGain: number;
  confidence: number;
  reasoning: string[];
}

export const analyzeBoxRecommendations = async (
  boxes: Box[], 
  parameters: any, 
  createItemsFromOrderData: (items: any[], masterItems: any[]) => any[]
): Promise<BoxRecommendation[]> => {
  const orders = await fetchOrders();
  
  // Filter for recent orders that need better packaging
  const recentOrders = orders.filter(order => 
    (order.status === 'ready_to_ship' || order.status === 'processing') &&
    order.items && Array.isArray(order.items) && order.items.length > 0
  );

  if (recentOrders.length === 0) {
    return [];
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
  const recommendations: BoxRecommendation[] = [];
  
  for (const [boxId, analysis] of boxAnalysis.entries()) {
    const catalogBox = CATALOG_BOXES.find(b => b.id === boxId);
    if (!catalogBox || analysis.orders.length === 0) continue;

    const avgEfficiencyGain = analysis.efficiencyImprovement / analysis.orders.length;
    const totalSavings = analysis.currentCost - analysis.catalogCost;
    
    // Only recommend if there's meaningful improvement
    if (avgEfficiencyGain > 5 || totalSavings > 0) {
      const uniqueReasons = [...new Set(analysis.reasoning)];
      
      recommendations.push({
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
  recommendations.sort((a, b) => {
    const aScore = (a.potentialOrders * 0.3) + (a.projectedSavings * 0.4) + (a.efficiencyGain * 0.3);
    const bScore = (b.potentialOrders * 0.3) + (b.projectedSavings * 0.4) + (b.efficiencyGain * 0.3);
    return bScore - aScore;
  });

  return recommendations.slice(0, 5); // Top 5 recommendations
};
