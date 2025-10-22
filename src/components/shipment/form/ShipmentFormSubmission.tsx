
import { RatesActionButton } from "@/components/shipment/RatesActionButton";
import { SmartRate, Rate } from "@/services/easypost";
import { CombinedRateResponse } from "@/services/rateShoppingService";
import { useShipmentSubmission } from "./hooks/useShipmentSubmission";
import { SelectedItem } from "@/types/fulfillment";

interface ShipmentFormSubmissionProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  selectedItems?: SelectedItem[];
  itemsLoading?: boolean;
  hasOrderId?: boolean;
  onShipmentCreated: (response: CombinedRateResponse, selectedRate: SmartRate | Rate | null, selectedBoxData?: any) => void;
}

export const ShipmentFormSubmission = ({ 
  loading, 
  setLoading,
  selectedItems,
  itemsLoading = false,
  hasOrderId = false,
  onShipmentCreated 
}: ShipmentFormSubmissionProps) => {
  const { handleFormSubmit } = useShipmentSubmission({
    loading,
    setLoading,
    selectedItems,
    onShipmentCreated
  });
  
  const isLoading = loading || (hasOrderId && itemsLoading);
  
  return (
    <div className="flex justify-end">
      <RatesActionButton 
        loading={isLoading} 
        onClick={handleFormSubmit}
      >
        {itemsLoading && hasOrderId ? "Loading items..." : undefined}
      </RatesActionButton>
    </div>
  );
};
