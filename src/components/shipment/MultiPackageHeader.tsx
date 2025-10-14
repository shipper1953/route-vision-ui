import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";

interface MultiPackageHeaderProps {
  packageCount: number;
  totalCost: number;
  onPurchaseAll: () => void;
  onStrategyChange: (strategy: 'optimal' | 'fastest' | 'cheapest') => void;
  activeStrategy: 'optimal' | 'fastest' | 'cheapest';
  purchasing: boolean;
  disabled: boolean;
}

export const MultiPackageHeader = ({
  packageCount,
  totalCost,
  onPurchaseAll,
  onStrategyChange,
  activeStrategy,
  purchasing,
  disabled
}: MultiPackageHeaderProps) => {
  return (
    <div className="space-y-4">
      <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-3xl font-bold text-foreground">{packageCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">Packages</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                ${totalCost.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
            </div>
          </div>

          <Button
            onClick={onPurchaseAll}
            disabled={disabled || purchasing}
            size="lg"
            className="bg-tms-blue hover:bg-tms-blue-400"
          >
            {purchasing ? 'Purchasing...' : 'Purchase All Labels'}
          </Button>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Rate Selection Strategy:</span>
        <div className="flex gap-2">
          <Button
            variant={activeStrategy === 'optimal' ? 'default' : 'outline'}
            onClick={() => onStrategyChange('optimal')}
            disabled={purchasing}
            className={activeStrategy === 'optimal' ? 'bg-tms-blue hover:bg-tms-blue-400' : ''}
          >
            Optimal
          </Button>
          <Button
            variant={activeStrategy === 'fastest' ? 'default' : 'outline'}
            onClick={() => onStrategyChange('fastest')}
            disabled={purchasing}
            className={activeStrategy === 'fastest' ? 'bg-tms-blue hover:bg-tms-blue-400' : ''}
          >
            Fastest
          </Button>
          <Button
            variant={activeStrategy === 'cheapest' ? 'default' : 'outline'}
            onClick={() => onStrategyChange('cheapest')}
            disabled={purchasing}
            className={activeStrategy === 'cheapest' ? 'bg-tms-blue hover:bg-tms-blue-400' : ''}
          >
            Cheapest
          </Button>
        </div>
      </div>
    </div>
  );
};