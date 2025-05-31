
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
      
      // Validate package dimensions and weight
      if (data.length <= 0 || data.width <= 0 || data.height <= 0 || data.weight <= 0) {
        toast.error("Package dimensions and weight must be greater than 0");
        return;
      }
      
      setLoading(true);
      toast.info("Getting shipping rates...");
      
      // Include order ID in the shipment reference if available
      const orderReference = data.orderId || data.orderBarcode || null;
      console.log("Using order reference for shipment:", orderReference);
      
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
        },
        // Include order reference for linking
        reference: orderReference
      };
      
      console.log("Creating shipment with data:", shipmentData);
      
      const response = await easyPostService.createShipment(shipmentData);
      
      // Store the shipment ID and order reference in the form context
      form.setValue("shipmentId", response.id);
      if (orderReference) {
        form.setValue("orderReference", orderReference);
      }
      
      if (!response.rates?.length && !response.smartrates?.length) {
        toast.error("No shipping rates available. Please check your package dimensions and try again.");
        return;
      }
      
      // Find recommended rate based on required delivery date
      let recommendedRate = null;
      
      console.log("Required delivery date from form:", data.requiredDeliveryDate);
      
      if (data.requiredDeliveryDate) {
        console.log("Finding rate for required delivery date:", data.requiredDeliveryDate);
        recommendedRate = findRecommendedRateByDate(response, data.requiredDeliveryDate);
      } else {
        console.log("No required delivery date, finding most economical rate");
        recommendedRate = findMostEconomicalRate(response);
      }
      
      toast.success("Shipment rates retrieved successfully");
      onShipmentCreated(response, recommendedRate);
    } catch (error) {
      console.error("Error creating shipment:", error);
      
      // Show more specific error message from EasyPost if available
      if (error instanceof Error && error.message.includes('EasyPost')) {
        toast.error(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to retrieve shipment rates. Please check your package dimensions and try again.");
      }
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
  console.log("Finding rate for delivery by:", requiredDate.toDateString());
  
  // First check SmartRates if available
  if (response.smartrates && response.smartrates.length > 0) {
    console.log("Checking SmartRates for delivery date requirement");
    
    // Filter by rates that will deliver by the required date
    const viableRates = response.smartrates.filter(rate => {
      if (!rate.delivery_date) return false;
      const deliveryDate = new Date(rate.delivery_date);
      const isViable = deliveryDate <= requiredDate;
      console.log(`Rate ${rate.carrier} ${rate.service}: delivers ${deliveryDate.toDateString()}, viable: ${isViable}`);
      return isViable;
    });
    
    console.log(`Found ${viableRates.length} viable SmartRates that meet delivery deadline`);
    
    if (viableRates.length > 0) {
      // First prioritize delivery date guaranteed options
      const guaranteedRates = viableRates.filter(rate => rate.delivery_date_guaranteed);
      
      if (guaranteedRates.length > 0) {
        // Sort guaranteed rates by price (lowest first)
        const selected = guaranteedRates.sort((a, b) => 
          parseFloat(a.rate) - parseFloat(b.rate)
        )[0];
        console.log(`Selected guaranteed delivery rate: ${selected.carrier} ${selected.service} - $${selected.rate}`);
        toast.success("Recommended shipping option with guaranteed delivery selected");
        return selected;
      } else {
        // If no guaranteed options, sort by price (lowest first) from rates that meet the deadline
        const selected = viableRates.sort((a, b) => 
          parseFloat(a.rate) - parseFloat(b.rate)
        )[0];
        console.log(`Selected cheapest viable rate: ${selected.carrier} ${selected.service} - $${selected.rate}`);
        toast.success("Recommended shipping option selected based on required delivery date");
        return selected;
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
        const selected = sortedByDelivery[0];
        console.log(`Selected fastest available rate instead: ${selected.carrier} ${selected.service}`);
        toast.info("Selected fastest available shipping option instead");
        return selected;
      }
    }
  } 
  // Fall back to regular rates if smartrates aren't available
  else if (response.rates && response.rates.length > 0) {
    console.log("Using standard rates (SmartRates not available)");
    // Sort regular rates by delivery days if available
    const sortedRates = [...response.rates].sort((a, b) => {
      if (a.delivery_days === undefined) return 1;
      if (b.delivery_days === undefined) return -1;
      return a.delivery_days - b.delivery_days;
    });
    
    // Select the fastest option for standard rates
    const selected = sortedRates[0];
    console.log(`Selected fastest standard rate: ${selected.carrier} ${selected.service}`);
    toast.info("Using standard rates (SmartRates not available)");
    return selected;
  }
  
  return null;
}

function findMostEconomicalRate(response: ShipmentResponse): SmartRate | Rate | null {
  if (response.smartrates && response.smartrates.length > 0) {
    // If no required date specified, recommend the most economical option
    const lowestRate = response.smartrates.sort((a, b) => 
      parseFloat(a.rate) - parseFloat(b.rate)
    )[0];
    console.log(`Selected most economical SmartRate: ${lowestRate.carrier} ${lowestRate.service} - $${lowestRate.rate}`);
    toast.success("Most economical shipping option selected");
    return lowestRate;
  } else if (response.rates && response.rates.length > 0) {
    // Fall back to standard rates
    const lowestRate = response.rates.sort((a, b) => 
      parseFloat(a.rate) - parseFloat(b.rate)
    )[0];
    console.log(`Selected most economical standard rate: ${lowestRate.carrier} ${lowestRate.service} - $${lowestRate.rate}`);
    toast.success("Most economical shipping option selected (standard rates)");
    return lowestRate;
  }
  
  return null;
}
