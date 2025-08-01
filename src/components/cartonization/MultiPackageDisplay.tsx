import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Package, Plus, Truck, DollarSign, Weight, Package2 } from 'lucide-react';
import { MultiPackageCartonizationResult, PackageRecommendation } from '@/services/cartonization/types';

interface MultiPackageDisplayProps {
  multiPackageResult: MultiPackageCartonizationResult;
  onAddPackage?: () => void;
  onEditPackage?: (packageIndex: number) => void;
  onPackageSelect?: (packageIndex: number) => void;
  selectedPackageIndex?: number;
}

interface PackageCardProps {
  package: PackageRecommendation;
  packageIndex: number;
  isSelected?: boolean;
  onEdit?: () => void;
  onSelect?: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({
  package: pkg,
  packageIndex,
  isSelected = false,
  onEdit,
  onSelect
}) => {
  const { box, assignedItems, utilization, packageWeight, confidence } = pkg;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'ring-2 ring-primary shadow-md' 
          : 'hover:shadow-sm hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Package {packageIndex + 1}</CardTitle>
          </div>
          <Badge variant={confidence >= 80 ? "default" : confidence >= 60 ? "secondary" : "destructive"}>
            {confidence}% confidence
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {box.name} • {assignedItems.length} items
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Box Details */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Box Dimensions</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-1 bg-muted/50 rounded">
              <div className="font-medium">{box.length}"</div>
              <div className="text-muted-foreground">L</div>
            </div>
            <div className="text-center p-1 bg-muted/50 rounded">
              <div className="font-medium">{box.width}"</div>
              <div className="text-muted-foreground">W</div>
            </div>
            <div className="text-center p-1 bg-muted/50 rounded">
              <div className="font-medium">{box.height}"</div>
              <div className="text-muted-foreground">H</div>
            </div>
          </div>
        </div>

        {/* Package Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Weight className="h-3 w-3 text-muted-foreground" />
            <span>{packageWeight.toFixed(1)} lbs</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span>{utilization.toFixed(1)}% fill</span>
          </div>
        </div>

        {/* Assigned Items */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Items ({assignedItems.length})</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {assignedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs bg-muted/30 p-1 rounded">
                <span className="truncate">{item.name}</span>
                <span className="text-muted-foreground">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Button */}
        {onEdit && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Edit Package
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const MultiPackageDisplay: React.FC<MultiPackageDisplayProps> = ({
  multiPackageResult,
  onAddPackage,
  onEditPackage,
  onPackageSelect,
  selectedPackageIndex
}) => {
  const {
    packages,
    totalPackages,
    totalWeight,
    totalCost,
    splittingStrategy,
    optimizationObjective,
    confidence
  } = multiPackageResult;

  const strategyLabels = {
    weight: 'Weight-based',
    volume: 'Volume-based',
    category: 'Category-based',
    fragility: 'Fragility-based',
    hybrid: 'Hybrid'
  };

  const objectiveLabels = {
    minimize_packages: 'Minimize Packages',
    minimize_cost: 'Minimize Cost',
    balanced: 'Balanced'
  };

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Multi-Package Solution</CardTitle>
            </div>
            <Badge variant={confidence >= 80 ? "default" : "secondary"}>
              {confidence}% confidence
            </Badge>
          </div>
          <CardDescription>
            {strategyLabels[splittingStrategy]} • {objectiveLabels[optimizationObjective]}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Package2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{totalPackages}</div>
                <div className="text-xs text-muted-foreground">Packages</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{totalWeight.toFixed(1)} lbs</div>
                <div className="text-xs text-muted-foreground">Total Weight</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">${totalCost.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Ready</div>
                <div className="text-xs text-muted-foreground">To Ship</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Package Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Package Details</h4>
          {onAddPackage && (
            <Button variant="outline" size="sm" onClick={onAddPackage}>
              <Plus className="h-4 w-4 mr-1" />
              Add Package
            </Button>
          )}
        </div>
        
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, index) => (
            <PackageCard
              key={index}
              package={pkg}
              packageIndex={index}
              isSelected={selectedPackageIndex === index}
              onEdit={onEditPackage ? () => onEditPackage(index) : undefined}
              onSelect={onPackageSelect ? () => onPackageSelect(index) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Package Creation Guide */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Each package will create a separate shipment. You can manually adjust items between packages if needed.
            </p>
            <div className="flex justify-center gap-2 text-xs text-muted-foreground">
              <span>Strategy: {strategyLabels[splittingStrategy]}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>Goal: {objectiveLabels[optimizationObjective]}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};