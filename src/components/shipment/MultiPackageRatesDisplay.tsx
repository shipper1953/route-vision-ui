import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Package, Truck, DollarSign, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { SmartRate, Rate } from '@/services/easypost';
import { RateShoppingService } from '@/services/rateShoppingService';
import { LabelService } from '@/services/easypost/labelService';
import { toast } from 'sonner';

interface PackageRate {
  packageIndex: number;
  dimensions: { length: number; width: number; height: number; weight: number };
  rates: (SmartRate | Rate)[];
  selectedRate?: SmartRate | Rate;
  loading: boolean;
  error?: string;
}

interface MultiPackageRatesDisplayProps {
  packages: Array<{ length: number; width: number; height: number; weight: number }>;
  toAddress: any;
  fromAddress: any;
  onRatesCalculated: (packageRates: PackageRate[]) => void;
  onPurchaseAll: (packageRates: PackageRate[]) => void;
}

export const MultiPackageRatesDisplay: React.FC<MultiPackageRatesDisplayProps> = ({
  packages,
  toAddress,
  fromAddress,
  onRatesCalculated,
  onPurchaseAll
}) => {
  const [packageRates, setPackageRates] = useState<PackageRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [expandedPackages, setExpandedPackages] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (packages.length > 0 && toAddress && fromAddress) {
      calculateRatesForAllPackages();
    }
  }, [packages, toAddress, fromAddress]);

  const calculateRatesForAllPackages = async () => {
    setLoading(true);
    const rateService = new RateShoppingService();
    
    // Initialize package rates
    const initialPackageRates: PackageRate[] = packages.map((pkg, index) => ({
      packageIndex: index,
      dimensions: pkg,
      rates: [],
      loading: true,
    }));
    
    setPackageRates(initialPackageRates);

    // Calculate rates for each package individually
    const updatedPackageRates = [...initialPackageRates];
    
    for (let i = 0; i < packages.length; i++) {
      try {
        const shipmentData = {
          to_address: toAddress,
          from_address: fromAddress,
          parcel: {
            length: packages[i].length,
            width: packages[i].width,
            height: packages[i].height,
            weight: packages[i].weight * 16 // Convert to ounces
          }
        };

        console.log(`Getting rates for package ${i + 1}:`, shipmentData);
        
        const response = await rateService.getRatesFromAllProviders(shipmentData);
        
        // Add shipment IDs and full shipment data to each rate for later use
        const allRates = [...(response.rates || []), ...(response.smartRates || [])].map(rate => ({
          ...rate,
          shipment_id: rate.provider === 'shippo' 
            ? response.shippo_shipment?.object_id 
            : response.easypost_shipment?.id,
          _shipment_data: {
            shippo_shipment: response.shippo_shipment,
            easypost_shipment: response.easypost_shipment
          }
        }));
        
        // Auto-select the cheapest rate
        const cheapestRate = allRates.reduce((prev, current) => 
          parseFloat(current.rate) < parseFloat(prev.rate) ? current : prev
        );

        updatedPackageRates[i] = {
          ...updatedPackageRates[i],
          rates: allRates,
          selectedRate: cheapestRate,
          loading: false
        };
        
        // Update state progressively
        setPackageRates([...updatedPackageRates]);
        
      } catch (error) {
        console.error(`Error getting rates for package ${i + 1}:`, error);
        updatedPackageRates[i] = {
          ...updatedPackageRates[i],
          error: error instanceof Error ? error.message : 'Failed to get rates',
          loading: false
        };
        setPackageRates([...updatedPackageRates]);
      }
    }
    
    setLoading(false);
    onRatesCalculated(updatedPackageRates);
  };

  const handleRateSelection = (packageIndex: number, rate: SmartRate | Rate) => {
    setPackageRates(prev => {
      const updatedRates = prev.map(pkg => 
        pkg.packageIndex === packageIndex 
          ? { ...pkg, selectedRate: rate }
          : pkg
      );
      // Call onRatesCalculated in next tick to avoid state update conflicts
      setTimeout(() => onRatesCalculated(updatedRates), 0);
      return updatedRates;
    });
  };

  const calculateTotalCost = () => {
    return packageRates.reduce((total, pkg) => 
      total + (pkg.selectedRate ? parseFloat(pkg.selectedRate.rate) : 0), 0
    );
  };

  const canPurchaseAll = () => {
    return packageRates.every(pkg => pkg.selectedRate && !pkg.loading && !pkg.error);
  };

  const handlePurchaseAll = async () => {
    if (!canPurchaseAll()) return;
    
    console.log('🚀 Starting multi-package purchase. Package rates:', packageRates.map((pkg, i) => ({
      packageIndex: i + 1,
      hasSelectedRate: !!pkg.selectedRate,
      rateId: pkg.selectedRate?.id,
      carrier: pkg.selectedRate?.carrier,
      service: pkg.selectedRate?.service,
      provider: (pkg.selectedRate as any)?.provider,
      hasShipmentId: !!(pkg.selectedRate as any)?.shipment_id,
      hasShipmentData: !!(pkg.selectedRate as any)?._shipment_data
    })));
    
    setPurchasing(true);
    try {
      await onPurchaseAll(packageRates);
    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to purchase labels');
    } finally {
      setPurchasing(false);
    }
  };

  const togglePackageExpanded = (packageIndex: number) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(packageIndex)) {
        newSet.delete(packageIndex);
      } else {
        newSet.add(packageIndex);
      }
      return newSet;
    });
  };

  if (loading && packageRates.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner className="mr-2" />
          <span>Calculating rates for {packages.length} packages...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Multi-Package Shipping Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{packages.length}</div>
              <div className="text-sm text-muted-foreground">Packages</div>
            </div>
            <div>
              <div className="text-2xl font-bold">${calculateTotalCost().toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </div>
            <div>
              <Button 
                onClick={handlePurchaseAll}
                disabled={!canPurchaseAll() || purchasing}
                className="w-full"
              >
                {purchasing ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Purchasing...
                  </>
                ) : (
                  'Purchase All Labels'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Package Rates */}
      <div className="space-y-4">
        {packageRates.map((packageRate, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Package {index + 1}
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  {packageRate.dimensions.length}" × {packageRate.dimensions.width}" × {packageRate.dimensions.height}" 
                  • {packageRate.dimensions.weight} lbs
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {packageRate.loading ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner className="mr-2" />
                  <span>Loading rates...</span>
                </div>
              ) : packageRate.error ? (
                <div className="text-center py-4 text-destructive">
                  Error: {packageRate.error}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-2">
                    {(expandedPackages.has(index) ? packageRate.rates : packageRate.rates.slice(0, 5)).map((rate, rateIndex) => (
                      <div
                        key={rateIndex}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          packageRate.selectedRate?.id === rate.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => handleRateSelection(index, rate)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {packageRate.selectedRate?.id === rate.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">
                                {rate.carrier} {rate.service}
                              </div>
                              {rate.delivery_days && (
                                <div className="text-xs text-muted-foreground">
                                  {rate.delivery_days} business days
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${parseFloat(rate.rate).toFixed(2)}</div>
                            {(rate as SmartRate).time_in_transit && (
                              <Badge variant="secondary" className="text-xs">
                                Smart Rate
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {packageRate.rates.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePackageExpanded(index)}
                      className="w-full gap-2"
                    >
                      {expandedPackages.has(index) ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View All {packageRate.rates.length} Rates
                        </>
                      )}
                    </Button>
                  )}
                  
                  {packageRate.selectedRate && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Selected:</span>
                        <span className="font-bold text-primary">
                          {packageRate.selectedRate.carrier} {packageRate.selectedRate.service} - 
                          ${parseFloat(packageRate.selectedRate.rate).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};