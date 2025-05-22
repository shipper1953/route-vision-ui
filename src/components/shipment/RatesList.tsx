
import { SmartRate, Rate } from "@/services/easypost";
import { RateOptionCard } from "./RateOptionCard";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownAZ, ArrowDown01, Clock } from "lucide-react";

interface RatesListProps {
  rates: (SmartRate | Rate)[];
  selectedRate: SmartRate | Rate | null;
  recommendedRate: SmartRate | null;
  setSelectedRate: (rate: SmartRate | Rate) => void;
}

type SortOption = "price" | "time" | "carrier";

export const RatesList = ({ 
  rates, 
  selectedRate, 
  recommendedRate, 
  setSelectedRate 
}: RatesListProps) => {
  const [sortedRates, setSortedRates] = useState<(SmartRate | Rate)[]>(rates);
  const [sortOption, setSortOption] = useState<SortOption>("price");

  // Sort rates whenever the sorting option or rates change
  useEffect(() => {
    const sortRates = () => {
      const ratesCopy = [...rates];
      
      switch (sortOption) {
        case "price":
          return ratesCopy.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
          
        case "time":
          return ratesCopy.sort((a, b) => {
            // Handle SmartRates (with delivery_date)
            const aIsSmartRate = 'delivery_date' in a;
            const bIsSmartRate = 'delivery_date' in b;
            
            if (aIsSmartRate && bIsSmartRate) {
              if (!a.delivery_date) return 1;
              if (!b.delivery_date) return -1;
              return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
            }
            
            // Fall back to delivery_days for standard rates
            const aDays = a.delivery_days !== undefined ? a.delivery_days : Number.MAX_SAFE_INTEGER;
            const bDays = b.delivery_days !== undefined ? b.delivery_days : Number.MAX_SAFE_INTEGER;
            return aDays - bDays;
          });
          
        case "carrier":
          return ratesCopy.sort((a, b) => {
            // First sort by carrier name
            const carrierCompare = a.carrier.localeCompare(b.carrier);
            if (carrierCompare !== 0) return carrierCompare;
            
            // Then sort by service name
            return a.service.localeCompare(b.service);
          });
          
        default:
          return ratesCopy;
      }
    };
    
    setSortedRates(sortRates());
  }, [rates, sortOption]);

  return (
    <div>
      <div className="flex gap-2 mb-4 justify-end">
        <Button
          size="sm"
          variant={sortOption === "price" ? "default" : "outline"}
          className={sortOption === "price" ? "bg-tms-blue" : ""}
          onClick={() => setSortOption("price")}
        >
          <ArrowDown01 className="h-4 w-4 mr-1" /> Price
        </Button>
        <Button
          size="sm"
          variant={sortOption === "time" ? "default" : "outline"}
          className={sortOption === "time" ? "bg-tms-blue" : ""}
          onClick={() => setSortOption("time")}
        >
          <Clock className="h-4 w-4 mr-1" /> Delivery
        </Button>
        <Button
          size="sm"
          variant={sortOption === "carrier" ? "default" : "outline"}
          className={sortOption === "carrier" ? "bg-tms-blue" : ""}
          onClick={() => setSortOption("carrier")}
        >
          <ArrowDownAZ className="h-4 w-4 mr-1" /> Carrier
        </Button>
      </div>

      <div className="space-y-4">
        {sortedRates.map((rate) => (
          <RateOptionCard
            key={rate.id}
            rate={rate}
            isSelected={selectedRate?.id === rate.id}
            isRecommended={recommendedRate?.id === rate.id}
            onSelect={setSelectedRate}
          />
        ))}
      </div>
    </div>
  );
};
