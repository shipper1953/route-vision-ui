
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { toast } from "sonner";

export function findRecommendedRateByDate(response: ShipmentResponse, requiredDateStr: string): SmartRate | Rate | null {
  const requiredDate = new Date(requiredDateStr);
  console.log("Finding rate for delivery by:", requiredDate.toDateString());
  
  // First check SmartRates if available - these have more accurate delivery predictions
  if (response.smartRates && response.smartRates.length > 0) {
    console.log("Checking SmartRates for delivery date requirement");
    
    // Filter by rates that will deliver by the required date
    const viableRates = response.smartRates.filter(rate => {
      if (!rate.delivery_date) return false;
      const deliveryDate = new Date(rate.delivery_date);
      const isViable = deliveryDate <= requiredDate;
      console.log(`SmartRate ${rate.carrier} ${rate.service}: delivers ${deliveryDate.toDateString()}, viable: ${isViable}, guaranteed: ${rate.delivery_date_guaranteed}`);
      return isViable;
    });
    
    console.log(`Found ${viableRates.length} viable SmartRates that meet delivery deadline`);
    
    if (viableRates.length > 0) {
      // First prioritize delivery date guaranteed options that meet the deadline
      const guaranteedRates = viableRates.filter(rate => rate.delivery_date_guaranteed);
      
      if (guaranteedRates.length > 0) {
        // Among guaranteed rates, select the cheapest one
        const selected = guaranteedRates.sort((a, b) => 
          parseFloat(a.rate) - parseFloat(b.rate)
        )[0];
        console.log(`✅ Selected guaranteed SmartRate: ${selected.carrier} ${selected.service} - $${selected.rate} (delivers ${new Date(selected.delivery_date!).toDateString()})`);
        toast.success(`Selected guaranteed delivery option: ${selected.carrier} ${selected.service}`);
        return selected;
      } else {
        // If no guaranteed options, sort by price (lowest first) from rates that meet the deadline
        const selected = viableRates.sort((a, b) => 
          parseFloat(a.rate) - parseFloat(b.rate)
        )[0];
        console.log(`✅ Selected cheapest viable SmartRate: ${selected.carrier} ${selected.service} - $${selected.rate} (delivers ${new Date(selected.delivery_date!).toDateString()})`);
        toast.success(`Selected best option to meet delivery date: ${selected.carrier} ${selected.service}`);
        return selected;
      }
    } else {
      toast.warning("No SmartRate options available to meet the required delivery date");
      
      // If no SmartRates meet the required date, find the fastest SmartRate option
      if (response.smartRates.length > 0) {
        const sortedByDelivery = [...response.smartRates].sort((a, b) => {
          if (!a.delivery_date) return 1;
          if (!b.delivery_date) return -1;
          return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
        });
        const selected = sortedByDelivery[0];
        console.log(`⚠️ Selected fastest available SmartRate instead: ${selected.carrier} ${selected.service}`);
        toast.info("Selected fastest available SmartRate option instead");
        return selected;
      }
    }
  } 
  // Fall back to regular rates if smartrates aren't available
  else if (response.rates && response.rates.length > 0) {
    console.log("Using standard rates (SmartRates not available)");
    
    // For standard rates, we need to estimate delivery dates based on delivery_days
    const currentDate = new Date();
    const viableStandardRates = response.rates.filter(rate => {
      if (rate.delivery_days === undefined) return false;
      
      // Estimate delivery date by adding business days
      const estimatedDeliveryDate = new Date(currentDate);
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + rate.delivery_days);
      
      const isViable = estimatedDeliveryDate <= requiredDate;
      console.log(`Standard Rate ${rate.carrier} ${rate.service}: estimated delivery ${estimatedDeliveryDate.toDateString()}, viable: ${isViable}`);
      return isViable;
    });
    
    if (viableStandardRates.length > 0) {
      // Select the cheapest viable standard rate
      const selected = viableStandardRates.sort((a, b) => 
        parseFloat(a.rate) - parseFloat(b.rate)
      )[0];
      console.log(`✅ Selected cheapest viable standard rate: ${selected.carrier} ${selected.service} - $${selected.rate}`);
      toast.info("Using standard rates (SmartRates not available) - selected cheapest option that meets deadline");
      return selected;
    } else {
      // If no standard rates meet the deadline, select the fastest
      const sortedRates = [...response.rates].sort((a, b) => {
        if (a.delivery_days === undefined) return 1;
        if (b.delivery_days === undefined) return -1;
        return a.delivery_days - b.delivery_days;
      });
      
      const selected = sortedRates[0];
      console.log(`⚠️ Selected fastest standard rate instead: ${selected.carrier} ${selected.service}`);
      toast.warning("No rates meet delivery deadline - selected fastest available option");
      return selected;
    }
  }
  
  return null;
}

export function findMostEconomicalRate(response: ShipmentResponse): SmartRate | Rate | null {
  // When no delivery date is specified, still prefer SmartRates for better accuracy
  if (response.smartRates && response.smartRates.length > 0) {
    // Find the most economical SmartRate
    const lowestRate = response.smartRates.sort((a, b) => 
      parseFloat(a.rate) - parseFloat(b.rate)
    )[0];
    console.log(`✅ Selected most economical SmartRate: ${lowestRate.carrier} ${lowestRate.service} - $${lowestRate.rate}`);
    toast.success("Most economical SmartRate selected");
    return lowestRate;
  } else if (response.rates && response.rates.length > 0) {
    // Fall back to standard rates
    const lowestRate = response.rates.sort((a, b) => 
      parseFloat(a.rate) - parseFloat(b.rate)
    )[0];
    console.log(`✅ Selected most economical standard rate: ${lowestRate.carrier} ${lowestRate.service} - $${lowestRate.rate}`);
    toast.success("Most economical rate selected (SmartRates not available)");
    return lowestRate;
  }
  
  return null;
}
