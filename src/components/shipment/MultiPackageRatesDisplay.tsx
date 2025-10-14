import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, ChevronDown, ChevronUp, Truck, Check } from "lucide-react";
import { RateShoppingService } from "@/services/rateShoppingService";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { MultiPackageHeader } from "./MultiPackageHeader";

interface PackageRate {
  packageIndex: number;
  packageDimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
    boxId?: string;
    boxSku?: string;
    boxName?: string;
  };
  rates: any[];
  selectedRate: any | null;
  loading: boolean;
  error?: string;
}

interface MultiPackageRatesDisplayProps {
  packages: Array<{
    length: number;
    width: number;
    height: number;
    weight: number;
    boxId?: string;
    boxSku?: string;
    boxName?: string;
  }>;
  fromAddress: any;
  toAddress: any;
  requiredDeliveryDate?: string | null;
  onRatesCalculated?: (totalCost: number, allRates: any[]) => void;
  onPurchaseAll?: (packageRates: PackageRate[]) => Promise<void>;
}

export const MultiPackageRatesDisplay = ({
  packages,
  fromAddress,
  toAddress,
  requiredDeliveryDate,
  onRatesCalculated,
  onPurchaseAll
}: MultiPackageRatesDisplayProps) => {
  const [packageRates, setPackageRates] = useState<PackageRate[]>([]);
  const [expandedPackages, setExpandedPackages] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<'optimal' | 'fastest' | 'cheapest'>('optimal');

  // Apply optimal strategy: Balance cost and speed, respect delivery date
  const applyOptimalStrategy = (rates: any[], pkg: any) => {
    let candidateRates = rates;
    
    // Filter by required delivery date if provided
    if (requiredDeliveryDate) {
      const requiredDate = new Date(requiredDeliveryDate);
      candidateRates = rates.filter(r => {
        if (r.delivery_date) {
          return new Date(r.delivery_date) <= requiredDate;
        }
        if (r.delivery_days != null) {
          const eta = new Date();
          eta.setDate(eta.getDate() + r.delivery_days);
          return eta <= requiredDate;
        }
        return false;
      });
      
      // If no rates meet the date, fall back to all rates
      if (candidateRates.length === 0) {
        candidateRates = rates;
      }
    }
    
    // Sort by price, then by speed
    const byPrice = [...candidateRates].sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
    const bySpeed = [...candidateRates].sort((a, b) => {
      const aDays = a.delivery_days ?? 99;
      const bDays = b.delivery_days ?? 99;
      return aDays - bDays;
    });
    
    // Create ranking maps
    const priceRanks = new Map<string, number>();
    const speedRanks = new Map<string, number>();
    byPrice.forEach((r, i) => priceRanks.set(r.id, i + 1));
    bySpeed.forEach((r, i) => speedRanks.set(r.id, i + 1));
    
    // Score each rate (lower is better): 60% price, 40% speed
    let bestRate = null;
    let bestScore = Infinity;
    
    for (const rate of candidateRates) {
      const priceRank = priceRanks.get(rate.id) || 999;
      const speedRank = speedRanks.get(rate.id) || 999;
      const score = priceRank * 0.6 + speedRank * 0.4;
      
      if (score < bestScore) {
        bestScore = score;
        bestRate = rate;
      }
    }
    
    return bestRate || byPrice[0];
  };

  // Apply fastest strategy: Select fastest delivery
  const applyFastestStrategy = (rates: any[]) => {
    return [...rates].sort((a, b) => {
      const aDays = a.delivery_days ?? 99;
      const bDays = b.delivery_days ?? 99;
      return aDays - bDays;
    })[0];
  };

  // Apply cheapest strategy: Select lowest cost, respect delivery date
  const applyCheapestStrategy = (rates: any[]) => {
    let candidateRates = rates;
    
    // Filter by required delivery date if provided
    if (requiredDeliveryDate) {
      const requiredDate = new Date(requiredDeliveryDate);
      candidateRates = rates.filter(r => {
        if (r.delivery_date) {
          return new Date(r.delivery_date) <= requiredDate;
        }
        if (r.delivery_days != null) {
          const eta = new Date();
          eta.setDate(eta.getDate() + r.delivery_days);
          return eta <= requiredDate;
        }
        return false;
      });
      
      // If no rates meet the date, fall back to all rates
      if (candidateRates.length === 0) {
        candidateRates = rates;
      }
    }
    
    return [...candidateRates].sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate))[0];
  };

  // Calculate rates for all packages on mount
  const calculateRatesForAllPackages = async () => {
    setLoading(true);
    const rateShoppingService = new RateShoppingService();
    
    const newPackageRates: PackageRate[] = [];
    
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      
      try {
        const shipmentData = {
          from_address: fromAddress,
          to_address: toAddress,
          parcel: {
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            weight: pkg.weight
          }
        };

        const response = await rateShoppingService.getRatesFromAllProviders(shipmentData);
        
        if (response.rates && response.rates.length > 0) {
          // Auto-select using optimal strategy by default
          const selectedRate = applyOptimalStrategy(response.rates, pkg);
          
          newPackageRates.push({
            packageIndex: i,
            packageDimensions: pkg,
            rates: response.rates,
            selectedRate: selectedRate,
            loading: false
          });
        } else {
          newPackageRates.push({
            packageIndex: i,
            packageDimensions: pkg,
            rates: [],
            selectedRate: null,
            loading: false,
            error: 'No rates available'
          });
        }
      } catch (error) {
        console.error(`Error getting rates for package ${i + 1}:`, error);
        newPackageRates.push({
          packageIndex: i,
          packageDimensions: pkg,
          rates: [],
          selectedRate: null,
          loading: false,
          error: 'Failed to fetch rates'
        });
      }
    }
    
    setPackageRates(newPackageRates);
    setLoading(false);
    
    // Notify parent of total cost
    const totalCost = newPackageRates.reduce((sum, pkg) => {
      return sum + (pkg.selectedRate ? parseFloat(pkg.selectedRate.rate) : 0);
    }, 0);
    
    if (onRatesCalculated) {
      const allRates = newPackageRates.map(pkg => pkg.selectedRate).filter(Boolean);
      onRatesCalculated(totalCost, allRates);
    }
  };

  useEffect(() => {
    if (packages.length > 0) {
      calculateRatesForAllPackages();
    }
  }, [packages.length]);

  const handleRateSelection = (packageIndex: number, rate: any) => {
    setPackageRates(prev => prev.map(pkg =>
      pkg.packageIndex === packageIndex
        ? { ...pkg, selectedRate: rate }
        : pkg
    ));
  };

  const handleStrategyChange = (strategy: 'optimal' | 'fastest' | 'cheapest') => {
    setActiveStrategy(strategy);
    
    // Apply the selected strategy to all packages
    setPackageRates(prev => prev.map(pkg => {
      if (!pkg.rates || pkg.rates.length === 0) return pkg;
      
      let selectedRate;
      switch (strategy) {
        case 'optimal':
          selectedRate = applyOptimalStrategy(pkg.rates, pkg.packageDimensions);
          break;
        case 'fastest':
          selectedRate = applyFastestStrategy(pkg.rates);
          break;
        case 'cheapest':
          selectedRate = applyCheapestStrategy(pkg.rates);
          break;
      }
      
      return { ...pkg, selectedRate };
    }));
    
    toast.success(`Applied ${strategy} strategy to all packages`);
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

  const calculateTotalCost = () => {
    return packageRates.reduce((sum, pkg) => 
      sum + (pkg.selectedRate ? parseFloat(pkg.selectedRate.rate) : 0), 0
    );
  };

  const canPurchaseAll = () => {
    return packageRates.length > 0 && packageRates.every(pkg => pkg.selectedRate && !pkg.loading && !pkg.error);
  };

  const handlePurchaseAll = async () => {
    if (!canPurchaseAll() || !onPurchaseAll) return;
    
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

  return (
    <div className="space-y-6">
      {loading && (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-tms-blue" />
          <p className="text-muted-foreground">Calculating rates for {packages.length} packages...</p>
        </Card>
      )}

      {!loading && packageRates.length > 0 && (
        <>
          {/* Multi-Package Header with Strategy Buttons */}
          <MultiPackageHeader
            packageCount={packages.length}
            totalCost={calculateTotalCost()}
            onPurchaseAll={handlePurchaseAll}
            onStrategyChange={handleStrategyChange}
            activeStrategy={activeStrategy}
            purchasing={purchasing}
            disabled={!canPurchaseAll()}
          />

          {/* Individual Package Cards */}
          <div className="space-y-4">
            {packageRates.map((packageRate, index) => (
              <Card key={index} className="border-border/50">
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">Package {index + 1}</h3>
                        <p className="text-sm text-muted-foreground">
                          {packageRate.packageDimensions.length}" × {packageRate.packageDimensions.width}" × {packageRate.packageDimensions.height}" • {packageRate.packageDimensions.weight} lbs
                        </p>
                      </div>
                    </div>
                    {packageRate.selectedRate && (
                      <div className="text-right">
                        <p className="font-bold text-lg">${parseFloat(packageRate.selectedRate.rate).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {packageRate.selectedRate.carrier} {packageRate.selectedRate.service}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {packageRate.loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Loading rates...</span>
                    </div>
                  ) : packageRate.error ? (
                    <div className="text-center py-4 text-destructive text-sm">
                      {packageRate.error}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(expandedPackages.has(index) ? packageRate.rates : packageRate.rates.slice(0, 5)).map((rate, rateIndex) => (
                        <div
                          key={rateIndex}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            packageRate.selectedRate?.id === rate.id
                              ? 'border-tms-blue bg-tms-blue/5'
                              : 'border-border hover:border-tms-blue/50'
                          }`}
                          onClick={() => handleRateSelection(index, rate)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {packageRate.selectedRate?.id === rate.id && (
                                <Check className="h-4 w-4 text-tms-blue" />
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
                              {rate.provider && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {rate.provider}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

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
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};