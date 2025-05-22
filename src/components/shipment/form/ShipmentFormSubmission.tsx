
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { RatesActionButton } from "@/components/shipment/RatesActionButton";
import { ShipmentForm } from "@/types/shipment";
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import easyPostService from "@/services/easypost";

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
  const form = useFormContext<ShipmentForm>();

  const handleFormSubmit = async () => {
    try {
      const data = form.getValues();
      console.log("Form submitted with data:", data);
      setLoading(true);
      toast.info("Getting shipping rates...");
      
      const shipmentData = {
        from_address: {
          name: data.fromName,
          company: data.fromCompany,
          street1: data.fromStreet1,
          street2: data.fromStreet2,
          city: data.fromCity,
          state: data.fromState,
          zip: data.fromZip,
          country: data.fromCountry,
          phone: data.fromPhone,
          email: data.fromEmail
        },
        to_address: {
          name: data.toName,
          company: data.toCompany,
          street1: data.toStreet1,
          street2: data.toStreet2,
          city: data.toCity,
          state: data.toState,
          zip: data.toZip,
          country: data.toCountry,
          phone: data.toPhone,
          email: data.toEmail
        },
        parcel: {
          length: data.length,
          width: data.width,
          height: data.height,
          weight: data.weight
        },
        options: {
          smartrate_accuracy: 'percentile_95'
        }
      };
      
      console.log("Creating shipment with data:", shipmentData);
      
      const response = await easyPostService.createShipment(shipmentData);
      
      // Store the shipment ID in the form context
      form.setValue("shipmentId", response.id);
      
      if (!response.rates?.length && !response.smartrates?.length) {
        toast.error("No shipping rates available. Please check your package dimensions and try again.");
        return;
      }
      
      // Find recommended rate based on required delivery date
      let recommendedRate = null;
      
      if (data.requiredDeliveryDate) {
        recommendedRate = findRecommendedRateByDate(response, data.requiredDeliveryDate);
      } else {
        recommendedRate = findMostEconomicalRate(response);
      }
      
      toast.success("Shipment rates retrieved successfully");
      onShipmentCreated(response, recommendedRate);
    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to retrieve shipment rates. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex justify-end">
      <RatesActionButton loading={loading} onClick={handleFormSubmit} />
    </div>
  );
};

// Helper functions
function findRecommendedRateByDate(response: ShipmentResponse, requiredDateStr: string): SmartRate | Rate | null {
  const requiredDate = new Date(requiredDateStr);
  
  // First check SmartRates if available
  if (response.smartrates && response.smartrates.length > 0) {
    // Filter by rates that will deliver by the required date
    const viableRates = response.smartrates.filter(rate => {
      if (!rate.delivery_date) return false;
      const deliveryDate = new Date(rate.delivery_date);
      return deliveryDate <= requiredDate;
    });
    
    if (viableRates.length > 0) {
      // First prioritize delivery date guaranteed options
      const guaranteedRates = viableRates.filter(rate => rate.delivery_date_guaranteed);
      
      if (guaranteedRates.length > 0) {
        // Sort guaranteed rates by price (lowest first)
        toast.success("Recommended shipping option with guaranteed delivery selected");
        return guaranteedRates.sort((a, b) => 
          parseFloat(a.rate) - parseFloat(b.rate)
        )[0];
      } else {
        // If no guaranteed options, sort by price (lowest first) from rates that meet the deadline
        toast.success("Recommended shipping option selected based on required delivery date");
        return viableRates.sort((a, b) => 
          parseFloat(a.rate) - parseFloat(b.rate)
        )[0];
      }
    } else {
      toast.warning("No shipping options available to meet the required delivery date");
      
      // If no options meet the required date, find the fastest option
      if (response.smartrates.length > 0) {
        const sortedByDelivery = [...response.smartrates].sort((a, b) => {
          if (!a.delivery_date) return 1;
          if (!b.delivery_date) return -1;
          return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
        });
        toast.info("Selected fastest available shipping option instead");
        return sortedByDelivery[0];
      }
    }
  } 
  // Fall back to regular rates if smartrates aren't available
  else if (response.rates && response.rates.length > 0) {
    // Sort regular rates by delivery days if available
    const sortedRates = [...response.rates].sort((a, b) => {
      if (a.delivery_days === undefined) return 1;
      if (b.delivery_days === undefined) return -1;
      return a.delivery_days - b.delivery_days;
    });
    
    // Select the fastest option for standard rates
    toast.info("Using standard rates (SmartRates not available)");
    return sortedRates[0];
  }
  
  return null;
}

function findMostEconomicalRate(response: ShipmentResponse): SmartRate | Rate | null {
  if (response.smartrates && response.smartrates.length > 0) {
    // If no required date specified, recommend the most economical option
    const lowestRate = response.smartrates.sort((a, b) => 
      parseFloat(a.rate) - parseFloat(b.rate)
    )[0];
    toast.success("Most economical shipping option selected");
    return lowestRate;
  } else if (response.rates && response.rates.length > 0) {
    // Fall back to standard rates
    const lowestRate = response.rates.sort((a, b) => 
      parseFloat(a.rate) - parseFloat(b.rate)
    )[0];
    toast.success("Most economical shipping option selected (standard rates)");
    return lowestRate;
  }
  
  return null;
}
