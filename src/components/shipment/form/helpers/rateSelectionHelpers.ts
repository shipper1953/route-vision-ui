
import { ShipmentResponse, SmartRate, Rate } from "@/services/easypost";
import { toast } from "sonner";

export function findRecommendedRateByDate(response: ShipmentResponse, requiredDateStr: string): SmartRate | Rate | null {
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

export function findMostEconomicalRate(response: ShipmentResponse): SmartRate | Rate | null {
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
