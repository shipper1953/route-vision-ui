
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ShipmentForm } from "@/types/shipment";
import { CombinedRate, CombinedRateResponse } from "@/services/rateShoppingService";
import { SmartRate, Rate } from "@/services/easypost";
import { SelectedItem } from "@/types/fulfillment";
import { useShipmentSubmission } from "./form/hooks/useShipmentSubmission";
import { 
  Check, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  Truck, 
  Package,
  CalendarCheck,
  CalendarX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, format, parseISO, isAfter, isBefore, isEqual } from "date-fns";

interface ShippingOptionsSectionProps {
  selectedItems?: SelectedItem[];
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
  onShipmentCreated?: (response: CombinedRateResponse, selectedRate: SmartRate | Rate | null, selectedBoxData?: any) => void;
  itemsLoading?: boolean;
  hasOrderId?: boolean;
}

interface SortedRate extends CombinedRate {
  meetsDeliveryDate: boolean | null;
  estimatedDeliveryDate: Date | null;
}

export const ShippingOptionsSection = ({
  selectedItems,
  loading: externalLoading = false,
  setLoading: externalSetLoading,
  onShipmentCreated,
  itemsLoading = false,
  hasOrderId = false,
}: ShippingOptionsSectionProps) => {
  const form = useFormContext<ShipmentForm>();
  const [rateResponse, setRateResponse] = useState<CombinedRateResponse | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const setLoading = externalSetLoading || (() => {});

  const { handleFormSubmit } = useShipmentSubmission({
    loading: externalLoading,
    setLoading,
    selectedItems,
    onShipmentCreated: (response, selectedRate, selectedBoxData) => {
      // Store the response to display rates
      setRateResponse(response);
      setFetchingRates(false);
      setHasFetched(true);

      // Auto-select recommended rate if provided
      if (selectedRate) {
        setSelectedRateId(selectedRate.id);
      }
    },
  });

  // Auto-fetch rates on mount
  useEffect(() => {
    if (!hasFetched && !fetchingRates && onShipmentCreated) {
      fetchRates();
    }
  }, []);

  const fetchRates = async () => {
    setFetchingRates(true);
    setFetchError(null);
    try {
      await handleFormSubmit();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch rates");
      setFetchingRates(false);
      setHasFetched(true);
    }
  };

  const requiredDeliveryDate = form.watch("requiredDeliveryDate");

  const getSortedRates = (): SortedRate[] => {
    if (!rateResponse?.rates) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ratesWithMeta: SortedRate[] = rateResponse.rates.map((rate) => {
      const deliveryDays = rate.delivery_days || rate.est_delivery_days || 0;
      const estimatedDeliveryDate = deliveryDays > 0
        ? addDays(today, deliveryDays)
        : rate.delivery_date
          ? parseISO(rate.delivery_date)
          : null;

      let meetsDeliveryDate: boolean | null = null;
      if (requiredDeliveryDate && estimatedDeliveryDate) {
        const reqDate = parseISO(requiredDeliveryDate);
        meetsDeliveryDate = isBefore(estimatedDeliveryDate, reqDate) || isEqual(estimatedDeliveryDate, reqDate);
      }

      return {
        ...rate,
        meetsDeliveryDate,
        estimatedDeliveryDate,
      };
    });

    // Sort: meets delivery date first, then by price
    return ratesWithMeta.sort((a, b) => {
      // If we have a required delivery date, prioritize rates that meet it
      if (a.meetsDeliveryDate !== null && b.meetsDeliveryDate !== null) {
        if (a.meetsDeliveryDate && !b.meetsDeliveryDate) return -1;
        if (!a.meetsDeliveryDate && b.meetsDeliveryDate) return 1;
      }
      // Then sort by price
      return parseFloat(a.rate) - parseFloat(b.rate);
    });
  };

  const handleSelectRate = (rate: SortedRate) => {
    setSelectedRateId(rate.id);
  };

  const handleConfirmRate = () => {
    if (!selectedRateId || !rateResponse || !onShipmentCreated) return;

    const selectedRate = rateResponse.rates.find((r) => r.id === selectedRateId);
    if (!selectedRate) return;

    const data = form.getValues();
    const selectedBoxData = {
      selectedBoxId: data.selectedBoxId,
      selectedBoxSku: data.selectedBoxSku || data.selectedBoxName,
      selectedBoxName: data.selectedBoxName,
      selectedBoxes: data.selectedBoxes,
      selectedItems: selectedItems,
      packageMetadata: {
        packageIndex: 0,
        items: selectedItems,
        boxData: {
          name: data.selectedBoxName || "Unknown",
          length: data.length || 0,
          width: data.width || 0,
          height: data.height || 0,
        },
        weight: data.weight || 0,
      },
    };

    onShipmentCreated(rateResponse, selectedRate as any, selectedBoxData);
  };

  // Loading state
  if (fetchingRates || externalLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size={32} />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Fetching Shipping Rates</h3>
              <p className="text-muted-foreground text-sm">
                Getting rates from multiple carriers...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <h3 className="font-semibold text-lg">Failed to Fetch Rates</h3>
              <p className="text-muted-foreground text-sm">{fetchError}</p>
            </div>
            <Button onClick={fetchRates} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No rates yet
  if (!rateResponse || !rateResponse.rates?.length) {
    if (hasFetched) {
      return (
        <Card className="border-yellow-500/50">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">No Rates Available</h3>
                <p className="text-muted-foreground text-sm">
                  No shipping rates were returned. Please check your addresses and package details.
                </p>
              </div>
              <Button onClick={fetchRates} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const sortedRates = getSortedRates();
  const meetsCount = sortedRates.filter((r) => r.meetsDeliveryDate === true).length;
  const doesNotMeetCount = sortedRates.filter((r) => r.meetsDeliveryDate === false).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Rates
              </CardTitle>
              <CardDescription>
                {sortedRates.length} rates found
                {requiredDeliveryDate && (
                  <span>
                    {" "}• Required by{" "}
                    <span className="font-medium text-foreground">
                      {format(parseISO(requiredDeliveryDate), "MMM d, yyyy")}
                    </span>
                    {meetsCount > 0 && (
                      <Badge variant="outline" className="ml-2 border-green-500 text-green-700">
                        {meetsCount} meet deadline
                      </Badge>
                    )}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={fetchRates} variant="ghost" size="sm">
              Refresh Rates
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Rates that meet delivery date */}
          {requiredDeliveryDate && meetsCount > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-green-700">
                <CalendarCheck className="h-4 w-4" />
                Meets Required Delivery Date
              </div>
              <div className="space-y-2">
                {sortedRates
                  .filter((r) => r.meetsDeliveryDate === true)
                  .map((rate) => (
                    <RateCard
                      key={rate.id}
                      rate={rate}
                      isSelected={selectedRateId === rate.id}
                      onSelect={() => handleSelectRate(rate)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Separator if both groups exist */}
          {requiredDeliveryDate && meetsCount > 0 && doesNotMeetCount > 0 && (
            <div className="flex items-center gap-2 my-3 text-sm font-medium text-yellow-700">
              <CalendarX className="h-4 w-4" />
              May Not Meet Required Delivery Date
            </div>
          )}

          {/* Rates that don't meet delivery date or no delivery date set */}
          <div className="space-y-2">
            {sortedRates
              .filter((r) => r.meetsDeliveryDate !== true)
              .map((rate) => (
                <RateCard
                  key={rate.id}
                  rate={rate}
                  isSelected={selectedRateId === rate.id}
                  onSelect={() => handleSelectRate(rate)}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirm selection */}
      {selectedRateId && onShipmentCreated && (
        <div className="flex justify-end">
          <Button onClick={handleConfirmRate} size="lg" className="gap-2">
            <Check className="h-4 w-4" />
            Confirm & Create Shipment
          </Button>
        </div>
      )}
    </div>
  );
};

// Individual rate card component
const RateCard = ({
  rate,
  isSelected,
  onSelect,
}: {
  rate: SortedRate;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const deliveryDays = rate.delivery_days || rate.est_delivery_days || 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Selection indicator */}
        <div
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>

        {/* Carrier & Service */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{rate.carrier}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm">{rate.service}</span>
            {rate.provider && (
              <Badge variant="secondary" className="text-xs">
                {rate.provider}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {deliveryDays > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {deliveryDays} {deliveryDays === 1 ? "day" : "days"}
              </span>
            )}
            {rate.estimatedDeliveryDate && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                Est. {format(rate.estimatedDeliveryDate, "MMM d")}
              </span>
            )}
            {rate.meetsDeliveryDate === true && (
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                ✓ On time
              </Badge>
            )}
            {rate.meetsDeliveryDate === false && (
              <Badge variant="outline" className="border-yellow-400 text-yellow-700 text-xs">
                May be late
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center gap-1 text-right">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-xl font-bold">{parseFloat(rate.rate).toFixed(2)}</span>
      </div>
    </button>
  );
};
