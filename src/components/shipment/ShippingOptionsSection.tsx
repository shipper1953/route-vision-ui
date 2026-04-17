
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyAddress } from "@/types/auth";
import { applyMarkupToRates, MarkedUpRate, MarkedUpSmartRate } from "@/utils/rateMarkupUtils";
import { LabelService } from "@/services/easypost/labelService";
import { toast } from "sonner";
import { 
  Check, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  Truck, 
  Package,
  CalendarCheck,
  CalendarX,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addBusinessDays, format, parseISO, isBefore, isEqual } from "date-fns";

interface ShippingOptionsSectionProps {
  selectedItems?: SelectedItem[];
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
  onRatesFetched?: (response: CombinedRateResponse) => void;
  onLabelPurchased?: (result: any) => void;
  itemsLoading?: boolean;
  hasOrderId?: boolean;
  orderId?: string;
}

interface SortedRate {
  rate: MarkedUpRate | MarkedUpSmartRate;
  meetsDeliveryDate: boolean | null;
  estimatedDeliveryDate: Date | null;
}

const getSafeRateAmount = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

export const ShippingOptionsSection = ({
  selectedItems,
  loading: externalLoading = false,
  setLoading: externalSetLoading,
  onRatesFetched,
  onLabelPurchased,
  itemsLoading = false,
  hasOrderId = false,
  orderId,
}: ShippingOptionsSectionProps) => {
  const form = useFormContext<ShipmentForm>();
  const { userProfile } = useAuth();
  const [rateResponse, setRateResponse] = useState<CombinedRateResponse | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [purchasingLabel, setPurchasingLabel] = useState(false);

  const setLoading = externalSetLoading || (() => {});

  // Fetch company markup settings
  useEffect(() => {
    const fetchCompany = async () => {
      if (!userProfile?.company_id) return;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", userProfile.company_id)
        .maybeSingle();
      if (data && !error) {
        setCompany({
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address as unknown as CompanyAddress | undefined,
          settings: data.settings,
          created_at: data.created_at,
          updated_at: data.updated_at,
          is_active: data.is_active,
          markup_type: (data.markup_type as "percentage" | "fixed") || "percentage",
          markup_value: data.markup_value || 0,
        });
      }
    };
    fetchCompany();
  }, [userProfile?.company_id]);

  const { handleFormSubmit } = useShipmentSubmission({
    loading: externalLoading,
    setLoading,
    selectedItems,
    onShipmentCreated: (response) => {
      setRateResponse(response);
      setFetchingRates(false);
      setHasFetched(true);
      onRatesFetched?.(response);
    },
  });

  // Auto-fetch rates on mount
  useEffect(() => {
    if (!hasFetched && !fetchingRates) {
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

    // Apply markup
    const markedUp = applyMarkupToRates(rateResponse.rates, company);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ratesWithMeta: SortedRate[] = markedUp.map((rate) => {
      const deliveryDays = rate.delivery_days || rate.est_delivery_days || 0;
      const estimatedDeliveryDate =
        deliveryDays > 0
          ? addBusinessDays(today, deliveryDays)
          : rate.delivery_date
            ? parseISO(rate.delivery_date)
            : null;

      let meetsDeliveryDate: boolean | null = null;
      if (requiredDeliveryDate) {
        if (estimatedDeliveryDate) {
          const reqDate = parseISO(requiredDeliveryDate);
          meetsDeliveryDate =
            isBefore(estimatedDeliveryDate, reqDate) || isEqual(estimatedDeliveryDate, reqDate);
        } else {
          // Unknown delivery time — treat as not meeting deadline so known-good rates rank above it
          meetsDeliveryDate = false;
        }
      }

      return { rate, meetsDeliveryDate, estimatedDeliveryDate };
    });

    // Sort order for Create Shipment:
    // 1) Rates that can meet the required delivery date come first.
    // 2) Within that order, lower cost comes first.
    // 3) If costs tie, earlier estimated delivery date comes first.
    return ratesWithMeta.sort((a, b) => {
      if (requiredDeliveryDate) {
        const deadlinePriority = (value: boolean | null) => (value === true ? 0 : 1);
        const priorityDiff = deadlinePriority(a.meetsDeliveryDate) - deadlinePriority(b.meetsDeliveryDate);
        if (priorityDiff !== 0) return priorityDiff;
      }

      const priceDiff = getSafeRateAmount(a.rate.rate) - getSafeRateAmount(b.rate.rate);
      if (priceDiff !== 0) return priceDiff;

      if (a.estimatedDeliveryDate && b.estimatedDeliveryDate) {
        const dateDiff = a.estimatedDeliveryDate.getTime() - b.estimatedDeliveryDate.getTime();
        if (dateDiff !== 0) return dateDiff;
      }
      if (a.estimatedDeliveryDate) return -1;
      if (b.estimatedDeliveryDate) return 1;

      return a.rate.id.localeCompare(b.rate.id);
    });
  };

  const handleConfirmAndBuy = async () => {
    if (!selectedRateId || !rateResponse) return;

    const selectedRate = rateResponse.rates.find((r) => r.id === selectedRateId);
    if (!selectedRate) return;

    setPurchasingLabel(true);
    try {
      // Determine shipment ID based on provider
      let shipmentId = rateResponse.id;
      const provider = (selectedRate as any).provider;

      if (provider === "easypost" && rateResponse.easypost_shipment?.id) {
        shipmentId = rateResponse.easypost_shipment.id;
      } else if (provider === "shippo" && rateResponse.shippo_shipment?.object_id) {
        shipmentId = rateResponse.shippo_shipment.object_id;
      }

      const data = form.getValues();

      // Find the marked-up rate to get original cost
      const markedUpRate = applyMarkupToRates([selectedRate], company)[0];
      const originalCost = parseFloat(markedUpRate.original_rate);
      const markedUpCost = parseFloat(markedUpRate.rate);

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

      const labelService = new LabelService("");
      const result = await labelService.purchaseLabel(
        shipmentId,
        selectedRate.id,
        orderId || null,
        provider,
        selectedBoxData,
        selectedItems,
        originalCost,
        markedUpCost
      );

      toast.success("Shipping label purchased successfully!");
      onLabelPurchased?.(result);
    } catch (error) {
      console.error("Error purchasing label:", error);
      toast.error(error instanceof Error ? error.message : "Failed to purchase label");
    } finally {
      setPurchasingLabel(false);
    }
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
              <p className="text-muted-foreground text-sm">Getting rates from multiple carriers...</p>
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
            <Button onClick={fetchRates} variant="outline">Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <Button onClick={fetchRates} variant="outline">Retry</Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const sortedRates = getSortedRates();
  const meetsCount = sortedRates.filter((r) => r.meetsDeliveryDate === true).length;

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
                    <Badge variant="outline" className="ml-2 text-xs">
                      Sorted: on-time first, then lowest cost
                    </Badge>
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={fetchRates} variant="ghost" size="sm">Refresh Rates</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            {sortedRates.map((item) => (
              <RateCard
                key={item.rate.id}
                sortedRate={item}
                isSelected={selectedRateId === item.rate.id}
                onSelect={() => setSelectedRateId(item.rate.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirm & Buy */}
      {selectedRateId && (
        <div className="flex justify-end">
          <Button
            onClick={handleConfirmAndBuy}
            size="lg"
            className="gap-2"
            disabled={purchasingLabel}
          >
            {purchasingLabel ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Purchasing Label...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Buy Label & Create Shipment
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

// Individual rate card
const RateCard = ({
  sortedRate,
  isSelected,
  onSelect,
}: {
  sortedRate: SortedRate;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const { rate } = sortedRate;
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
        <div
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{rate.carrier}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-sm">{rate.service}</span>
            {(rate as any).provider && (
              <Badge variant="secondary" className="text-xs">
                {(rate as any).provider}
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
            {sortedRate.estimatedDeliveryDate && (
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                Est. {format(sortedRate.estimatedDeliveryDate, "MMM d")}
              </span>
            )}
            {sortedRate.meetsDeliveryDate === true && (
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">✓ On time</Badge>
            )}
            {sortedRate.meetsDeliveryDate === false && (
              <Badge variant="outline" className="border-yellow-400 text-yellow-700 text-xs">May be late</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-xl font-bold">{parseFloat(rate.rate).toFixed(2)}</span>
        </div>
      </div>
    </button>
  );
};
