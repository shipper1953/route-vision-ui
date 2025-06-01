
import { RatesActionButton } from "@/components/shipment/RatesActionButton";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { useShipmentSubmission } from "./hooks/useShipmentSubmission";

interface ShipmentFormSubmissionProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onShipmentCreated: (response: ShipmentResponse, selectedRate: SmartRate | Rate | null) => void;
}

export const ShipmentFormSubmission = ({ 
  loading, 
  setLoading, 
  onShipmentCreated 
}: ShipmentFormSubmissionProps) => {
  const { handleFormSubmit } = useShipmentSubmission({
    loading,
    setLoading,
    onShipmentCreated
  });
  
  return (
    <div className="flex justify-end">
      <RatesActionButton loading={loading} onClick={handleFormSubmit} />
    </div>
  );
};
