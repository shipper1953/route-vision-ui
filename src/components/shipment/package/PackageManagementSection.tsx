import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ItemSelectionCard } from '../ItemSelectionCard';
import { 
  Package, 
  Plus, 
  Trash2, 
  Weight, 
  Ruler, 
  ShoppingCart,
  Scan,
  ChevronDown,
  Move,
  X
} from 'lucide-react';
import { useCartonization } from '@/hooks/useCartonization';
import { useMultiPackageCartonization } from '@/hooks/useMultiPackageCartonization';
import { useItemMaster } from '@/hooks/useItemMaster';
import { MultiPackageCartonizationResult, PackageRecommendation } from '@/services/cartonization/types';
import { useFormContext } from 'react-hook-form';
import { ShipmentForm } from '@/types/shipment';

interface PackageManagementSectionProps {
  orderItems?: any[];
  selectedItems?: any[];
  onItemsSelected?: (items: any[]) => void;
  itemsAlreadyShipped?: Array<{ itemId: string; quantityShipped: number }>;
  orderId?: string;
}

interface PackageRectangleProps {
  package: PackageRecommendation;
  packageIndex: number;
  totalPackages: number;
  availableBoxes: any[];
  orderItems: any[];
  onBoxChange: (packageIndex: number, boxId: string) => void;
  onAddItem: (packageIndex: number, item: any) => void;
  onRemoveItem: (packageIndex: number, itemIndex: number) => void;
  onDeletePackage: (packageIndex: number) => void;
  onMoveItem: (fromPackage: number, toPackage: number, itemIndex: number) => void;
}

interface PackageRectangleProps {
  package: PackageRecommendation;
  packageIndex: number;
  totalPackages: number;
  availableBoxes: any[];
  orderItems: any[];
  onBoxChange: (packageIndex: number, boxId: string) => void;
  onAddItem: (packageIndex: number, item: any) => void;
  onRemoveItem: (packageIndex: number, itemIndex: number) => void;
  onDeletePackage: (packageIndex: number) => void;
  onMoveItem: (fromPackage: number, toPackage: number, itemIndex: number) => void;
}

const PackageRectangle: React.FC<PackageRectangleProps> = ({
  package: pkg,
  packageIndex,
  totalPackages,
  availableBoxes,
  orderItems,
  onBoxChange,
  onAddItem,
  onRemoveItem,
  onDeletePackage,
  onMoveItem
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const { box, assignedItems, utilization, packageWeight, confidence } = pkg;

  const handleScanItem = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && scanInput.trim()) {
      // Find item by SKU or name
      const foundItem = orderItems.find(item => 
        (item as any).sku?.toLowerCase() === scanInput.toLowerCase() ||
        item.name?.toLowerCase().includes(scanInput.toLowerCase())
      );
      
      if (foundItem) {
        onAddItem(packageIndex, foundItem);
        setScanInput('');
      }
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (conf >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getUtilizationColor = (util: number) => {
    if (util >= 80) return 'bg-red-500';
    if (util >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="w-full border-2 hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                Package {packageIndex + 1}
                <Badge className={`${getConfidenceColor(confidence)} border`}>
                  {confidence}% confidence
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{assignedItems.length} items</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
            {totalPackages > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeletePackage(packageIndex)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Box Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Box Selection
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Select value={box.id} onValueChange={(value) => onBoxChange(packageIndex, value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                 <SelectContent className="z-50 bg-background">
                  {availableBoxes.map((availableBox) => (
                    <SelectItem key={availableBox.id} value={availableBox.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{availableBox.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {availableBox.length}"×{availableBox.width}"×{availableBox.height}"
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-muted-foreground" />
                  <span>{box.length}"×{box.width}"×{box.height}"</span>
                </div>
              </div>
            </div>
          </div>

          {/* Package Metrics */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Weight</span>
              </div>
              <div className="text-lg font-bold">{packageWeight.toFixed(1)} lbs</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Utilization</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="text-lg font-bold">{utilization.toFixed(1)}%</div>
                <div className={`w-2 h-2 rounded-full ${getUtilizationColor(utilization)}`} />
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Items</span>
              </div>
              <div className="text-lg font-bold">{assignedItems.length}</div>
            </div>
          </div>

          {/* Item Scanning */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Scan or Add Items
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Scan barcode or enter SKU/name..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScanItem}
                className="flex-1"
              />
              <Select onValueChange={(value) => {
                const item = orderItems.find(i => i.id === value);
                if (item) onAddItem(packageIndex, item);
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Add" />
                </SelectTrigger>
                 <SelectContent className="z-50 bg-background">
                  {orderItems.filter(item => 
                    !assignedItems.some(assigned => assigned.id === item.id)
                  ).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned Items */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Items in Package</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {assignedItems.map((item, itemIndex) => (
                <div 
                  key={itemIndex} 
                  className="flex items-center justify-between p-2 bg-muted/30 rounded border"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                      fromPackage: packageIndex,
                      itemIndex,
                      item
                    }));
                  }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Move className="h-3 w-3 text-muted-foreground cursor-grab" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(item as any).sku || item.id} • Qty: {item.quantity}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {totalPackages > 1 && (
                      <Select onValueChange={(value) => {
                        const targetPackage = parseInt(value);
                        if (targetPackage !== packageIndex) {
                          onMoveItem(packageIndex, targetPackage, itemIndex);
                        }
                      }}>
                        <SelectTrigger className="w-20 h-6">
                          <SelectValue placeholder="Move" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {Array.from({ length: totalPackages }, (_, i) => i)
                            .filter(i => i !== packageIndex)
                            .map((i) => (
                              <SelectItem key={i} value={i.toString()}>
                                Pkg {i + 1}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(packageIndex, itemIndex)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {assignedItems.length === 0 && (
                <div 
                  className="p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-muted-foreground"
                  onDrop={(e) => {
                    e.preventDefault();
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (data.fromPackage !== packageIndex) {
                      onMoveItem(data.fromPackage, packageIndex, data.itemIndex);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Scan className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Scan items or drag them here</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export const PackageManagementSection: React.FC<PackageManagementSectionProps> = ({
  orderItems = [],
  selectedItems = [],
  onItemsSelected,
  itemsAlreadyShipped = [],
  orderId
}) => {
  const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);
  const form = useFormContext<ShipmentForm>();
  const { createItemsFromOrderData } = useCartonization();
  const { items: masterItems } = useItemMaster();
  const { boxes } = useCartonization();
  
  const {
    multiPackageResult,
    addManualPackage,
    editPackage,
    calculateMultiPackage,
    removePackage,
  } = useMultiPackageCartonization();

  // Update selected order items when selection changes
  useEffect(() => {
    if (selectedItems && selectedItems.length > 0) {
      setSelectedOrderItems(selectedItems);
    }
  }, [selectedItems]);

  // Initialize cartonization when selected items change
  useEffect(() => {
    if (selectedOrderItems && selectedOrderItems.length > 0) {
      const items = createItemsFromOrderData(selectedOrderItems, masterItems);
      if (items.length > 0) {
        calculateMultiPackage(items, 'balanced');
      }
    }
  }, [selectedOrderItems, masterItems, createItemsFromOrderData, calculateMultiPackage]);

  // Expose multi-package parcels and selected boxes to the form
  useEffect(() => {
    if (multiPackageResult) {
      try {
        const parcels = multiPackageResult.packages.map((pkg) => ({
          length: pkg.box.length,
          width: pkg.box.width,
          height: pkg.box.height,
          weight: Math.max(1, Math.round((pkg as any).packageWeight || 1)),
          items: pkg.assignedItems || [], // Include assigned items in each package
        }));
        (form as any).setValue('multiParcels', parcels);
        
        // Store selected boxes information
        const selectedBoxes = multiPackageResult.packages.map((pkg, index) => ({
          boxId: pkg.box.id,
          boxSku: (pkg.box as any).sku || pkg.box.name,
          boxName: pkg.box.name,
          packageIndex: index
        }));
        (form as any).setValue('selectedBoxes', selectedBoxes);
        
        // Also sync the primary parcel fields for validation/rate shopping
        if (parcels.length) {
          const first = parcels[0];
          const firstBox = multiPackageResult.packages[0].box;
          form.setValue('length', first.length);
          form.setValue('width', first.width);
          form.setValue('height', first.height);
          form.setValue('weight', first.weight);
          
          // Set primary selected box info
          form.setValue('selectedBoxId', firstBox.id);
          form.setValue('selectedBoxSku', (firstBox as any).sku || firstBox.name);
          form.setValue('selectedBoxName', firstBox.name);
        }
        localStorage.setItem('multiParcels', JSON.stringify(parcels));
        localStorage.setItem('selectedBoxes', JSON.stringify(selectedBoxes));
      } catch (e) {
        console.warn('Failed to prepare multiParcels:', e);
      }
    }
  }, [multiPackageResult, form]);

  const handleBoxChange = (packageIndex: number, boxId: string) => {
    const newBox = boxes.find(b => b.id === boxId);
    if (newBox && multiPackageResult) {
      const updatedPackage = {
        ...multiPackageResult.packages[packageIndex],
        box: newBox
      };
      editPackage(packageIndex, updatedPackage);
    }
  };

  const handleAddItem = (packageIndex: number, item: any) => {
    if (multiPackageResult) {
      const currentPackage = multiPackageResult.packages[packageIndex];
      const updatedItems = [...currentPackage.assignedItems, item];
      editPackage(packageIndex, { assignedItems: updatedItems });
    }
  };

  const handleRemoveItem = (packageIndex: number, itemIndex: number) => {
    if (multiPackageResult) {
      const currentPackage = multiPackageResult.packages[packageIndex];
      const updatedItems = currentPackage.assignedItems.filter((_, idx) => idx !== itemIndex);
      editPackage(packageIndex, { assignedItems: updatedItems });
    }
  };

  const handleMoveItem = (fromPackage: number, toPackage: number, itemIndex: number) => {
    if (multiPackageResult) {
      const sourcePackage = multiPackageResult.packages[fromPackage];
      const targetPackage = multiPackageResult.packages[toPackage];
      const item = sourcePackage.assignedItems[itemIndex];
      
      // Remove from source
      const sourceItems = sourcePackage.assignedItems.filter((_, idx) => idx !== itemIndex);
      editPackage(fromPackage, { assignedItems: sourceItems });
      
      // Add to target
      const targetItems = [...targetPackage.assignedItems, item];
      editPackage(toPackage, { assignedItems: targetItems });
    }
  };

  const handleDeletePackage = (packageIndex: number) => {
    removePackage(packageIndex);
  };

  if (!multiPackageResult) {
    return (
      <div className="space-y-6">
        {orderItems.length > 0 && onItemsSelected && (
          <>
            {selectedOrderItems.length === 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Select Items to Ship</h3>
                      <p className="text-sm text-muted-foreground">
                        Please select which items from this order you want to ship below. 
                        You can select individual items and quantities for partial fulfillment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <ItemSelectionCard
              orderItems={orderItems}
              onItemsSelected={onItemsSelected}
              itemsAlreadyShipped={itemsAlreadyShipped}
              orderId={orderId}
            />
          </>
        )}
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Package Management</h3>
                <p className="text-muted-foreground">
                  {selectedOrderItems.length > 0 
                    ? 'Analyzing your items for optimal packaging...' 
                    : orderItems.length > 0
                      ? 'Select items above to see packaging recommendations'
                      : 'Add items to see packaging recommendations'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Package Management</h2>
          <p className="text-muted-foreground">
            Scan items into packages or adjust the AI recommendations
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {multiPackageResult.totalPackages} packages • {multiPackageResult.totalWeight.toFixed(1)} lbs total
          </div>
          <Button onClick={addManualPackage} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </Button>
        </div>
      </div>

      {/* Package Rectangles */}
      <div className="space-y-4">
        {multiPackageResult.packages.map((pkg, index) => (
          <PackageRectangle
            key={index}
            package={pkg}
            packageIndex={index}
            totalPackages={multiPackageResult.totalPackages}
            availableBoxes={boxes}
            orderItems={orderItems}
            onBoxChange={handleBoxChange}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onDeletePackage={handleDeletePackage}
            onMoveItem={handleMoveItem}
          />
        ))}
      </div>

      {/* Instructions */}
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Scan className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How to use Package Management:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Scan barcodes or search for items to add them to packages</li>
                <li>• Drag items between packages or use the move dropdown</li>
                <li>• Change box sizes using the dropdown in each package</li>
                <li>• Monitor utilization - green is optimal, yellow is acceptable, red is overpacked</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};