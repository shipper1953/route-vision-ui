
import { SmartRate, Rate } from "@/services/easypost";
import { RateOptionCard } from "./RateOptionCard";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownAZ, ArrowDown01, Clock, DollarSign, Zap, Star } from "lucide-react";
import { RankedRateRecommendations } from "@/services/cartonization/types";

interface RatesListProps {
  rates: (SmartRate | Rate)[];
  selectedRate: SmartRate | Rate | null;
  recommendedRate: SmartRate | Rate | null;
  setSelectedRate: (rate: SmartRate | Rate) => void;
  rankedRecommendations?: RankedRateRecommendations | null;
}

type SortOption = "price" | "time" | "carrier";

export const RatesList = ({ 
  rates, 
  selectedRate, 
  recommendedRate, 
  setSelectedRate,
  rankedRecommendations
}: RatesListProps) => {
  const [sortedRates, setSortedRates] = useState<(SmartRate | Rate)[]>(rates);
  const [sortOption, setSortOption] = useState<SortOption>("price");

  useEffect(() => {
    const sortRates = () => {
      const ratesCopy = [...rates];
      switch (sortOption) {
        case "price":
          return ratesCopy.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
        case "time":
          return ratesCopy.sort((a, b) => {
            const aIsSmartRate = 'delivery_date' in a;
            const bIsSmartRate = 'delivery_date' in b;
            if (aIsSmartRate && bIsSmartRate) {
              if (!a.delivery_date) return 1;
              if (!b.delivery_date) return -1;
              return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
            }
            const aDays = a.delivery_days !== undefined ? a.delivery_days : Number.MAX_SAFE_INTEGER;
            const bDays = b.delivery_days !== undefined ? b.delivery_days : Number.MAX_SAFE_INTEGER;
            return aDays - bDays;
          });
        case "carrier":
          return ratesCopy.sort((a, b) => {
            const carrierCompare = a.carrier.localeCompare(b.carrier);
            if (carrierCompare !== 0) return carrierCompare;
            return a.service.localeCompare(b.service);
          });
        default:
          return ratesCopy;
      }
    };
    setSortedRates(sortRates());
  }, [rates, sortOption]);

  const getRateBadge = (rateId: string) => {
    if (!rankedRecommendations) return null;
    const badges = [];
    if (rankedRecommendations.cheapest?.rateId === rateId) {
      badges.push(
        <Badge key="cheapest" variant="outline" className="border-green-300 bg-green-50 text-green-700 text-xs">
          <DollarSign className="h-3 w-3 mr-0.5" />Cheapest
        </Badge>
      );
    }
    if (rankedRecommendations.fastest?.rateId === rateId) {
      badges.push(
        <Badge key="fastest" variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 text-xs">
          <Zap className="h-3 w-3 mr-0.5" />Fastest
        </Badge>
      );
    }
    if (rankedRecommendations.bestValue?.rateId === rateId) {
      badges.push(
        <Badge key="best_value" variant="outline" className="border-purple-300 bg-purple-50 text-purple-700 text-xs">
          <Star className="h-3 w-3 mr-0.5" />Best Value
        </Badge>
      );
    }
    return badges.length > 0 ? <div className="flex gap-1">{badges}</div> : null;
  };

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
          <div key={rate.id} className="space-y-1">
            {getRateBadge(rate.id)}
            <RateOptionCard
              rate={rate}
              isSelected={selectedRate?.id === rate.id}
              isRecommended={recommendedRate?.id === rate.id}
              onSelect={setSelectedRate}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
