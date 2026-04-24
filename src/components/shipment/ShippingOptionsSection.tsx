
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { RateShoppingService } from "@/services/rateShoppingService";
import { BulkShippingLabelDialog } from "@/components/cartonization/BulkShippingLabelDialog";
import { MultiPackageProgressDialog, PackageProgressItem } from "./MultiPackageProgressDialog";
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

interface PackageRateBreakdown {
  packageIndex: number;
  boxName?: string;
  amount: number;
  matched: boolean; // false when we had to fall back to a different service for this package
  matchedCarrier?: string;
  matchedService?: string;
}

interface SortedRate {
  rate: MarkedUpRate | MarkedUpSmartRate;
  meetsDeliveryDate: boolean | null;
  estimatedDeliveryDate: Date | null;
  // Multi-package: total cost across all packages and per-package breakdown
  totalAmount?: number;
  packageBreakdown?: PackageRateBreakdown[];
}

const getSafeRateAmount = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const rateKey = (r: any) => `${r.provider || ''}|${r.carrier || ''}|${r.service || ''}`;

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
  const [purchaseProgress, setPurchaseProgress] = useState<string | null>(null);
  const [bulkLabels, setBulkLabels] = useState<Array<{ orderId: string; labelUrl: string; trackingNumber: string; carrier: string; service: string }>>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [packageProgress, setPackageProgress] = useState<PackageProgressItem[]>([]);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressComplete, setProgressComplete] = useState(false);
  // Per-additional-package rate maps (index 0 corresponds to package 2, etc.)
  const [extraPackageRates, setExtraPackageRates] = useState<Array<Map<string, any>>>([]);
  const [fetchingPackageRates, setFetchingPackageRates] = useState(false);
  const [packageRateError, setPackageRateError] = useState<string | null>(null);

  // Detect multi-package shipment
  const multiParcelsFromForm = (form as any)?.watch?.('multiParcels') as Array<any> | undefined;
  const storedMultiParcels = (() => {
    try { return JSON.parse(localStorage.getItem('multiParcels') || '[]'); } catch { return []; }
  })();
  const multiParcels: Array<any> = (Array.isArray(multiParcelsFromForm) && multiParcelsFromForm.length > 0)
    ? multiParcelsFromForm
    : storedMultiParcels;
  const isMultiPackage = Array.isArray(multiParcels) && multiParcels.length > 1;

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

  // For multi-package shipments, fetch rates for packages 2..N so we can show
  // the true total cost (and per-package breakdown) on each shipping option.
  useEffect(() => {
    if (!isMultiPackage || !rateResponse?.rates?.length) return;

    let cancelled = false;
    const fetchExtras = async () => {
      setFetchingPackageRates(true);
      setPackageRateError(null);
      try {
        const data = form.getValues();
        const fromAddress = {
          name: data.fromName, company: data.fromCompany,
          street1: data.fromStreet1, street2: data.fromStreet2,
          city: data.fromCity, state: data.fromState,
          zip: data.fromZip, country: data.fromCountry,
          phone: data.fromPhone || '5555555555', email: data.fromEmail,
        };
        const toAddress = {
          name: data.toName, company: data.toCompany,
          street1: data.toStreet1, street2: data.toStreet2,
          city: data.toCity, state: data.toState,
          zip: data.toZip, country: data.toCountry,
          phone: data.toPhone || '5555555555', email: data.toEmail,
        };

        const rateService = new RateShoppingService();
        const extras: Array<Map<string, any>> = [];
        // Skip index 0 — already covered by rateResponse
        for (let i = 1; i < multiParcels.length; i++) {
          if (cancelled) return;
          const parcel = multiParcels[i];
          try {
            const combined = await rateService.getRatesFromAllProviders({
              from_address: fromAddress,
              to_address: toAddress,
              parcel: {
                length: parcel.length,
                width: parcel.width,
                height: parcel.height,
                weight: parcel.weight,
              },
              options: { label_format: 'PDF' },
            } as any);
            const map = new Map<string, any>();
            for (const r of (combined.rates || [])) {
              map.set(rateKey(r), r);
            }
            extras.push(map);
          } catch (err) {
            console.error(`Failed to fetch rates for package ${i + 1}:`, err);
            extras.push(new Map()); // empty map = no rates available for this package
          }
        }
        if (!cancelled) setExtraPackageRates(extras);
      } catch (err) {
        if (!cancelled) {
          setPackageRateError(err instanceof Error ? err.message : 'Failed to fetch package rates');
        }
      } finally {
        if (!cancelled) setFetchingPackageRates(false);
      }
    };
    fetchExtras();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiPackage, rateResponse?.id, multiParcels.length]);

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

      // Multi-package: build per-package breakdown using the rates we fetched
      // for packages 2..N. Match by provider+carrier+service; if the package
      // doesn't have an exact match, fall back to that package's cheapest
      // rate from the same provider so the total reflects what we'd actually buy.
      let totalAmount: number | undefined;
      let packageBreakdown: PackageRateBreakdown[] | undefined;
      if (isMultiPackage) {
        const data = form.getValues();
        const firstAmount = parseFloat(rate.rate);
        const firstBox = (data.selectedBoxes || []).find((b: any) => b.packageIndex === 0)
          || (data.selectedBoxes || [])[0];
        packageBreakdown = [{
          packageIndex: 0,
          boxName: firstBox?.boxName,
          amount: Number.isFinite(firstAmount) ? firstAmount : 0,
          matched: true,
          matchedCarrier: rate.carrier,
          matchedService: rate.service,
        }];
        let runningTotal = packageBreakdown[0].amount;
        const targetKey = rateKey(rate);
        const targetProvider = (rate as any).provider;

        for (let i = 0; i < extraPackageRates.length; i++) {
          const pkgIdx = i + 1; // index 0 in extraPackageRates = package 2
          const pkgMap = extraPackageRates[i];
          const boxEntry = (data.selectedBoxes || []).find((b: any) => b.packageIndex === pkgIdx)
            || (data.selectedBoxes || [])[pkgIdx];
          let candidate: any = pkgMap.get(targetKey);
          let matched = true;
          if (!candidate) {
            // fall back to cheapest from same provider
            const sameProvider = Array.from(pkgMap.values()).filter((r: any) => r.provider === targetProvider);
            if (sameProvider.length > 0) {
              candidate = sameProvider.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate))[0];
              matched = false;
            }
          }
          if (!candidate) {
            // last resort: cheapest of any provider
            const all = Array.from(pkgMap.values());
            if (all.length > 0) {
              candidate = all.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate))[0];
              matched = false;
            }
          }
          if (candidate) {
            const markedCandidate = applyMarkupToRates([candidate], company)[0];
            const amt = parseFloat(markedCandidate.rate);
            const safeAmt = Number.isFinite(amt) ? amt : 0;
            packageBreakdown.push({
              packageIndex: pkgIdx,
              boxName: boxEntry?.boxName,
              amount: safeAmt,
              matched,
              matchedCarrier: candidate.carrier,
              matchedService: candidate.service,
            });
            runningTotal += safeAmt;
          } else {
            packageBreakdown.push({
              packageIndex: pkgIdx,
              boxName: boxEntry?.boxName,
              amount: 0,
              matched: false,
            });
          }
        }
        totalAmount = runningTotal;
      }

      return { rate, meetsDeliveryDate, estimatedDeliveryDate, totalAmount, packageBreakdown };
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

      const aPrice = a.totalAmount ?? getSafeRateAmount(a.rate.rate);
      const bPrice = b.totalAmount ?? getSafeRateAmount(b.rate.rate);
      const priceDiff = aPrice - bPrice;
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
      const data = form.getValues();
      const labelService = new LabelService("");

      // ===== MULTI-PACKAGE FLOW =====
      // When the order requires multiple packages, purchase one label per package
      // using the same carrier+service the user selected.
      if (isMultiPackage) {
        const provider = (selectedRate as any).provider as string;
        const carrier = (selectedRate as any).carrier as string;
        const service = (selectedRate as any).service as string;

        const fromAddress = {
          name: data.fromName, company: data.fromCompany,
          street1: data.fromStreet1, street2: data.fromStreet2,
          city: data.fromCity, state: data.fromState,
          zip: data.fromZip, country: data.fromCountry,
          phone: data.fromPhone || '5555555555', email: data.fromEmail,
        };
        const toAddress = {
          name: data.toName, company: data.toCompany,
          street1: data.toStreet1, street2: data.toStreet2,
          city: data.toCity, state: data.toState,
          zip: data.toZip, country: data.toCountry,
          phone: data.toPhone || '5555555555', email: data.toEmail,
        };

        // Initialize per-package progress and open the progress dialog
        const initialProgress: PackageProgressItem[] = multiParcels.map((parcel, idx) => {
          const boxEntry = (data.selectedBoxes || []).find((b: any) => b.packageIndex === idx)
            || (data.selectedBoxes || [])[idx];
          return {
            index: idx,
            boxName: boxEntry?.boxName || undefined,
            dimensions: { length: parcel.length, width: parcel.width, height: parcel.height },
            weight: parcel.weight,
            rateStatus: 'pending',
            labelStatus: 'pending',
          };
        });
        setPackageProgress(initialProgress);
        setProgressComplete(false);
        setShowProgressDialog(true);

        const updatePkg = (idx: number, patch: Partial<PackageProgressItem>) => {
          setPackageProgress((prev) => prev.map((p) => (p.index === idx ? { ...p, ...patch } : p)));
        };

        const rateService = new RateShoppingService();
        const purchasedLabels: Array<{ orderId: string; labelUrl: string; trackingNumber: string; carrier: string; service: string }> = [];
        const errors: string[] = [];
        let firstResult: any = null;

        for (let i = 0; i < multiParcels.length; i++) {
          const parcel = multiParcels[i];
          setPurchaseProgress(`Processing package ${i + 1} of ${multiParcels.length}...`);
          updatePkg(i, { rateStatus: 'running' });

          try {
            // Reuse cached rates fetched during rate-shopping for packages 2..N
            // to avoid re-creating Shippo/EasyPost shipments (which can flake with
            // "Address not found" on rapid duplicate calls).
            let pkgRate: any = null;
            let matchType: 'exact' | 'fallback-provider' | 'fallback-cheapest' = 'exact';

            if (i === 0) {
              pkgRate = selectedRate;
            } else {
              const cachedMap = extraPackageRates[i - 1];
              const targetKey = `${provider}|${carrier}|${service}`;
              if (cachedMap) {
                pkgRate = cachedMap.get(targetKey);
                if (!pkgRate) {
                  const sameProvider = Array.from(cachedMap.values()).filter((r: any) => r.provider === provider);
                  if (sameProvider.length > 0) {
                    pkgRate = sameProvider.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate))[0];
                    matchType = 'fallback-provider';
                  }
                }
                if (!pkgRate) {
                  const all = Array.from(cachedMap.values());
                  if (all.length > 0) {
                    pkgRate = all.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate))[0];
                    matchType = 'fallback-cheapest';
                  }
                }
              }

              // Last-resort: re-fetch rates for this package if cache is empty/missing
              if (!pkgRate) {
                const combined = await rateService.getRatesFromAllProviders({
                  from_address: fromAddress,
                  to_address: toAddress,
                  parcel: {
                    length: parcel.length,
                    width: parcel.width,
                    height: parcel.height,
                    weight: parcel.weight,
                  },
                  options: { label_format: 'PDF' },
                } as any);
                pkgRate = combined.rates.find(
                  (r: any) => r.provider === provider && r.carrier === carrier && r.service === service
                );
                if (!pkgRate) {
                  const sp = combined.rates.filter((r: any) => r.provider === provider);
                  if (sp.length > 0) {
                    pkgRate = sp.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate))[0];
                    matchType = 'fallback-provider';
                  }
                }
                if (!pkgRate && combined.rates.length > 0) {
                  pkgRate = combined.rates.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate))[0];
                  matchType = 'fallback-cheapest';
                }
              }
            }

            if (!pkgRate) {
              throw new Error(`No rates available for package ${i + 1}`);
            }

            // Apply markup so the rate displayed matches what the customer is charged
            const markedUpPkgRate = applyMarkupToRates([pkgRate], company)[0];
            const displayAmount = parseFloat(markedUpPkgRate.rate);

            updatePkg(i, {
              rateStatus: 'success',
              matchedRate: {
                carrier: pkgRate.carrier,
                service: pkgRate.service,
                provider: pkgRate.provider,
                amount: displayAmount,
                matchType,
              },
              labelStatus: 'running',
            });

            const pkgProvider = pkgRate.provider as string;
            let pkgShipmentId: string | undefined;
            const stored = (pkgRate as any)?._shipment_data;
            if (pkgProvider === 'shippo') {
              pkgShipmentId = pkgRate.shipment_id || stored?.shippo_shipment?.object_id;
            } else if (pkgProvider === 'easyship') {
              pkgShipmentId = pkgRate.shipment_id || stored?.easyship_shipment?.object_id;
            } else {
              pkgShipmentId = pkgRate.shipment_id || stored?.easypost_shipment?.id;
            }
            if (!pkgShipmentId) {
              throw new Error(`Missing shipment ID for package ${i + 1}`);
            }

            const selectedBoxEntry = (data.selectedBoxes || []).find((b: any) => b.packageIndex === i)
              || (data.selectedBoxes || [])[i]
              || null;

            const pkgItems = Array.isArray(parcel.items) ? parcel.items : [];

            const pkgSelectedBoxData = {
              selectedBoxId: selectedBoxEntry?.boxId || null,
              selectedBoxSku: selectedBoxEntry?.boxSku || selectedBoxEntry?.boxName || null,
              selectedBoxName: selectedBoxEntry?.boxName || 'Unknown',
              packageMetadata: {
                packageIndex: i,
                items: pkgItems,
                boxData: {
                  name: selectedBoxEntry?.boxName || 'Unknown',
                  length: parcel.length,
                  width: parcel.width,
                  height: parcel.height,
                },
                weight: parcel.weight,
              },
            };

            const pkgOriginalCost = parseFloat(markedUpPkgRate.original_rate);
            const pkgMarkedUpCost = parseFloat(markedUpPkgRate.rate);

            const easyshipPayload = pkgProvider === 'easyship'
              ? (stored as any)?.easyship_shipment?.shipmentPayload
              : undefined;

            const result = await labelService.purchaseLabel(
              pkgShipmentId,
              pkgRate.id,
              orderId || null,
              pkgProvider,
              pkgSelectedBoxData,
              pkgItems,
              pkgOriginalCost,
              pkgMarkedUpCost,
              easyshipPayload
            );

            if (i === 0) firstResult = result;

            const labelUrl = result?.labelUrl || result?.postage_label?.label_url || result?.label_url;
            const trackingNumber = result?.trackingNumber || result?.tracking_code || result?.tracking_number || 'N/A';

            if (labelUrl) {
              purchasedLabels.push({
                orderId: orderId ? `${orderId} • Pkg ${i + 1}` : `Package ${i + 1}`,
                labelUrl,
                trackingNumber,
                carrier: result?.carrier || pkgRate.carrier || 'Unknown',
                service: result?.service || pkgRate.service || 'Unknown',
              });
              updatePkg(i, { labelStatus: 'success', trackingNumber });
            } else {
              throw new Error('Label URL missing from response');
            }
          } catch (pkgErr: any) {
            console.error(`Failed to process package ${i + 1}:`, pkgErr);
            const message = pkgErr?.message || 'failed';
            errors.push(`Package ${i + 1}: ${message}`);
            // Mark whichever step is currently running as failed
            setPackageProgress((prev) => prev.map((p) => {
              if (p.index !== i) return p;
              if (p.rateStatus === 'running') {
                return { ...p, rateStatus: 'failed', rateError: message, labelStatus: 'failed' };
              }
              if (p.labelStatus === 'running') {
                return { ...p, labelStatus: 'failed', labelError: message };
              }
              return { ...p, labelStatus: 'failed', labelError: message };
            }));
          }
        }

        setPurchaseProgress(null);
        setProgressComplete(true);

        if (purchasedLabels.length === 0) {
          throw new Error(errors.join('; ') || 'Failed to purchase any labels');
        }

        if (errors.length > 0) {
          toast.error(`Purchased ${purchasedLabels.length}/${multiParcels.length} labels. Errors: ${errors.join('; ')}`);
        } else {
          toast.success(`Successfully purchased ${purchasedLabels.length} shipping labels!`);
        }

        setBulkLabels(purchasedLabels);

        if (firstResult) {
          onLabelPurchased?.({
            ...firstResult,
            multiPackage: true,
            packagesCount: purchasedLabels.length,
            suppressDialog: true,
          });
        }
        return;
      }

      // ===== SINGLE PACKAGE FLOW =====
      let shipmentId = rateResponse.id;
      const provider = (selectedRate as any).provider;

      if (provider === "easypost" && rateResponse.easypost_shipment?.id) {
        shipmentId = rateResponse.easypost_shipment.id;
      } else if (provider === "shippo" && rateResponse.shippo_shipment?.object_id) {
        shipmentId = rateResponse.shippo_shipment.object_id;
      } else if (provider === "easyship" && rateResponse.easyship_shipment?.object_id) {
        shipmentId = rateResponse.easyship_shipment.object_id;
      }

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

      const easyshipShipmentPayload =
        provider === "easyship" ? rateResponse.easyship_shipment?.shipmentPayload : undefined;

      const result = await labelService.purchaseLabel(
        shipmentId,
        selectedRate.id,
        orderId || null,
        provider,
        selectedBoxData,
        selectedItems,
        originalCost,
        markedUpCost,
        easyshipShipmentPayload
      );

      const normalizedResult = {
        ...result,
        carrier: result?.carrier || (selectedRate as any)?.carrier || (selectedRate as any)?.provider || "Unknown",
        service:
          result?.service ||
          result?.rate?.servicelevel?.name ||
          result?.servicelevel?.name ||
          (selectedRate as any)?.service ||
          "Unknown",
      };

      toast.success("Shipping label purchased successfully!");
      onLabelPurchased?.(normalizedResult);
    } catch (error) {
      console.error("Error purchasing label:", error);
      toast.error(error instanceof Error ? error.message : "Failed to purchase label");
    } finally {
      setPurchasingLabel(false);
      setPurchaseProgress(null);
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

      {/* Multi-package notice */}
      {isMultiPackage && (
        <Card className="border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/20">
          <CardContent className="py-3 flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-blue-600" />
            <span>
              This order requires <strong>{multiParcels.length} packages</strong>. Prices below
              show the <strong>total across all packages</strong> with a per-package breakdown.
              {fetchingPackageRates && (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-700">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading rates for additional packages…
                </span>
              )}
              {packageRateError && (
                <span className="ml-2 text-destructive">{packageRateError}</span>
              )}
            </span>
          </CardContent>
        </Card>
      )}

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
                {isMultiPackage ? (purchaseProgress || 'Processing packages...') : (purchaseProgress || 'Purchasing Label...')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isMultiPackage
                  ? `Buy ${multiParcels.length} Labels & Create Shipments`
                  : 'Buy Label & Create Shipment'}
              </>
            )}
          </Button>
        </div>
      )}

      <MultiPackageProgressDialog
        isOpen={showProgressDialog}
        onClose={() => {
          setShowProgressDialog(false);
          if (bulkLabels.length > 0) setShowBulkDialog(true);
        }}
        packages={packageProgress}
        isComplete={progressComplete}
        selectedCarrier={selectedRateId ? (rateResponse?.rates.find(r => r.id === selectedRateId) as any)?.carrier : undefined}
        selectedService={selectedRateId ? (rateResponse?.rates.find(r => r.id === selectedRateId) as any)?.service : undefined}
      />

      <BulkShippingLabelDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        shipmentLabels={bulkLabels}
      />
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
  const breakdown = sortedRate.packageBreakdown;
  const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 1;
  const displayPrice = sortedRate.totalAmount ?? parseFloat(rate.rate);
  const hasFallback = hasBreakdown && breakdown!.some((p) => !p.matched);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex flex-col gap-3 p-4 rounded-lg border-2 transition-all text-left",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between gap-4">
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
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
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
              {hasBreakdown && (
                <Badge variant="outline" className="text-xs">
                  {breakdown!.length} packages
                </Badge>
              )}
              {hasFallback && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs gap-1 hover:bg-amber-100">
                  <AlertTriangle className="h-3 w-3" />
                  Mixed services
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-bold">{displayPrice.toFixed(2)}</span>
          </div>
          {hasBreakdown && (
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              total · {breakdown!.length} pkgs
            </div>
          )}
        </div>
      </div>

      {hasBreakdown && (
        <div className="ml-9 rounded-md border bg-muted/30 divide-y divide-border/60 overflow-hidden">
          {breakdown!.map((pkg) => {
            const substituted = !pkg.matched && !!pkg.matchedCarrier;
            const noRate = !pkg.matched && !pkg.matchedCarrier;
            return (
              <div
                key={pkg.packageIndex}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 text-xs",
                  substituted && "bg-amber-50/60",
                  noRate && "bg-destructive/5"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background border flex-shrink-0">
                    <Package className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-foreground truncate">
                        Package {pkg.packageIndex + 1}
                      </span>
                      {pkg.boxName && (
                        <span className="text-muted-foreground truncate">· {pkg.boxName}</span>
                      )}
                    </div>
                    {substituted && (
                      <span className="text-[11px] text-amber-700 truncate">
                        Substituted: {pkg.matchedCarrier} {pkg.matchedService}
                      </span>
                    )}
                    {noRate && (
                      <span className="text-[11px] text-destructive">No rate available</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {substituted && (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] px-1.5 py-0 h-4 gap-0.5"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Sub
                    </Badge>
                  )}
                  <span
                    className={cn(
                      "font-mono font-semibold tabular-nums",
                      noRate && "text-destructive"
                    )}
                  >
                    ${pkg.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
};
