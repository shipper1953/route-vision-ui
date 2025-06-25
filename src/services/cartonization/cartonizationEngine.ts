
export interface Item {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  quantity: number;
}

export interface Box {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  cost: number;
  inStock: number;
  type: 'box' | 'poly_bag';
}

export interface CartonizationResult {
  recommendedBox: Box;
  utilization: number;
  itemsFit: boolean;
  totalWeight: number;
  totalVolume: number;
  savings: number;
  alternatives: Array<{
    box: Box;
    utilization: number;
    cost: number;
  }>;
}

export class CartonizationEngine {
  private boxes: Box[];

  constructor(boxes: Box[]) {
    this.boxes = boxes.filter(box => box.inStock > 0);
  }

  calculateOptimalBox(items: Item[]): CartonizationResult | null {
    if (!items.length || !this.boxes.length) return null;

    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalVolume = items.reduce((sum, item) => 
      sum + (item.length * item.width * item.height * item.quantity), 0
    );

    // Find boxes that can fit the weight
    const suitableBoxes = this.boxes.filter(box => box.maxWeight >= totalWeight);
    
    if (!suitableBoxes.length) return null;

    // Calculate utilization for each suitable box
    const boxAnalysis = suitableBoxes.map(box => {
      const boxVolume = box.length * box.width * box.height;
      const utilization = Math.min((totalVolume / boxVolume) * 100, 100);
      const itemsFit = this.checkItemsFit(items, box);
      
      return {
        box,
        utilization,
        itemsFit,
        cost: box.cost,
        volumeEfficiency: utilization
      };
    });

    // Filter to only boxes where items actually fit
    const fittingBoxes = boxAnalysis.filter(analysis => analysis.itemsFit);
    
    if (!fittingBoxes.length) return null;

    // Sort by best utilization (highest utilization but not overpacked)
    const sortedBoxes = fittingBoxes.sort((a, b) => {
      if (a.utilization > 95 && b.utilization <= 95) return 1;
      if (b.utilization > 95 && a.utilization <= 95) return -1;
      return b.utilization - a.utilization;
    });

    const recommendedAnalysis = sortedBoxes[0];
    const alternatives = sortedBoxes.slice(1, 4).map(analysis => ({
      box: analysis.box,
      utilization: analysis.utilization,
      cost: analysis.cost
    }));

    // Calculate potential savings compared to largest box
    const largestBox = suitableBoxes.reduce((max, box) => 
      box.cost > max.cost ? box : max
    );
    const savings = largestBox.cost - recommendedAnalysis.box.cost;

    return {
      recommendedBox: recommendedAnalysis.box,
      utilization: recommendedAnalysis.utilization,
      itemsFit: true,
      totalWeight,
      totalVolume,
      savings: Math.max(0, savings),
      alternatives
    };
  }

  private checkItemsFit(items: Item[], box: Box): boolean {
    // Simple 3D bin packing check - can be enhanced with more sophisticated algorithms
    const sortedItems = [...items].sort((a, b) => 
      (b.length * b.width * b.height) - (a.length * a.width * a.height)
    );

    let remainingLength = box.length;
    let remainingWidth = box.width;
    let remainingHeight = box.height;

    for (const item of sortedItems) {
      for (let i = 0; i < item.quantity; i++) {
        // Check if item fits in any orientation
        const orientations = [
          [item.length, item.width, item.height],
          [item.length, item.height, item.width],
          [item.width, item.length, item.height],
          [item.width, item.height, item.length],
          [item.height, item.length, item.width],
          [item.height, item.width, item.length]
        ];

        let itemFits = false;
        for (const [l, w, h] of orientations) {
          if (l <= remainingLength && w <= remainingWidth && h <= remainingHeight) {
            itemFits = true;
            break;
          }
        }

        if (!itemFits) return false;
      }
    }

    return true;
  }
}
