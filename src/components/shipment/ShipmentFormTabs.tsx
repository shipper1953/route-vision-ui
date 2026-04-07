
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddressFormSection } from "@/components/shipment/AddressFormSection";
import { PackageDetailsSection } from "@/components/shipment/PackageDetailsSection";
import { ShippingOptionsSection } from "@/components/shipment/ShippingOptionsSection";
import { ShipmentFormSubmission } from "@/components/shipment/form/ShipmentFormSubmission";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Package, ChevronRight, ChevronLeft, MapPin, Settings, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CombinedRateResponse } from "@/services/rateShoppingService";
import { SmartRate, Rate } from "@/services/easypost";
import { SelectedItem } from "@/types/fulfillment";

interface ShipmentFormTabsProps {
  orderItems?: any[];
  selectedItems?: SelectedItem[];
  onItemsSelected?: (items: any[]) => void;
  itemsAlreadyShipped?: Array<{ itemId: string; quantityShipped: number }>;
  orderId?: string;
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
  itemsLoading?: boolean;
  hasOrderId?: boolean;
  onShipmentCreated?: (response: CombinedRateResponse, selectedRate: SmartRate | Rate | null, selectedBoxData?: any) => void;
}

const STEPS = [
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "package", label: "Package Details", icon: Package },
  { key: "options", label: "Shipping Options", icon: Settings },
] as const;

type StepKey = typeof STEPS[number]["key"];

export const ShipmentFormTabs = ({ 
  orderItems = [], 
  selectedItems = [], 
  onItemsSelected, 
  itemsAlreadyShipped = [],
  orderId,
  loading = false,
  setLoading,
  itemsLoading = false,
  hasOrderId = false,
  onShipmentCreated,
}: ShipmentFormTabsProps) => {
  const [currentStep, setCurrentStep] = useState<StepKey>("addresses");
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].key);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].key);
    }
  };

  const goToStep = (stepKey: StepKey) => {
    const targetIndex = STEPS.findIndex(s => s.key === stepKey);
    if (targetIndex <= currentIndex + 1) {
      setCurrentStep(stepKey);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = index < currentIndex;
          const isClickable = index <= currentIndex + 1;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && goToStep(step.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/10 text-primary cursor-pointer",
                  !isActive && !isCompleted && isClickable && "text-muted-foreground hover:bg-muted cursor-pointer",
                  !isActive && !isCompleted && !isClickable && "text-muted-foreground/50 cursor-not-allowed"
                )}
                disabled={!isClickable}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{index + 1}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2",
                  isCompleted ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {currentStep === "addresses" && (
        <div className="space-y-6">
          <AddressFormSection 
            type="from" 
            title="From Address" 
            description="Sender information and address"
          />
          <AddressFormSection 
            type="to" 
            title="To Address" 
            description="Recipient information and address"
          />
        </div>
      )}

      {currentStep === "package" && (
        <div className="space-y-6">
          {selectedItems && selectedItems.length > 0 && orderId && (
            <Alert>
              <Package className="h-4 w-4" />
              <AlertTitle>Items to Ship</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  {selectedItems.map(item => (
                    <div key={item.itemId} className="flex justify-between text-sm">
                      <span>{item.name} ({item.sku})</span>
                      <span className="font-medium">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <PackageDetailsSection
            orderItems={orderItems}
            selectedItems={selectedItems}
            onItemsSelected={onItemsSelected}
            itemsAlreadyShipped={itemsAlreadyShipped}
            orderId={orderId}
          />
        </div>
      )}

      {currentStep === "options" && (
        <div className="space-y-6">
          <ShippingOptionsSection
            selectedItems={selectedItems}
            loading={loading}
            setLoading={setLoading}
            onShipmentCreated={onShipmentCreated}
            itemsLoading={itemsLoading}
            hasOrderId={hasOrderId}
          />
        </div>
      )}

      {/* Step Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {currentIndex < STEPS.length - 1 && (
          <Button
            type="button"
            onClick={goNext}
            className="gap-2"
          >
            Next: {STEPS[currentIndex + 1].label}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
