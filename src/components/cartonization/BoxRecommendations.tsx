import { PackagingIntelligenceDashboard } from "@/components/packaging/PackagingIntelligenceDashboard";

interface BoxRecommendationsProps {
  onAddToInventory?: (boxData: {
    name: string;
    sku: string;
    length: number;
    width: number;
    height: number;
    cost: number;
    box_type: 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom';
    max_weight?: number;
    in_stock?: number;
    min_stock?: number;
    max_stock?: number;
  }) => void;
}

export const BoxRecommendations = ({ onAddToInventory }: BoxRecommendationsProps) => {
  return <PackagingIntelligenceDashboard onAddToInventory={onAddToInventory} />;
};
