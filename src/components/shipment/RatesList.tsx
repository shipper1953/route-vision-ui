
import { SmartRate, Rate } from "@/services/easypost";
import { RateOptionCard } from "./RateOptionCard";

interface RatesListProps {
  rates: (SmartRate | Rate)[];
  selectedRate: SmartRate | Rate | null;
  recommendedRate: SmartRate | null;
  setSelectedRate: (rate: SmartRate | Rate) => void;
}

export const RatesList = ({ 
  rates, 
  selectedRate, 
  recommendedRate, 
  setSelectedRate 
}: RatesListProps) => {
  return (
    <div className="space-y-4">
      {rates?.map((rate) => (
        <RateOptionCard
          key={rate.id}
          rate={rate}
          isSelected={selectedRate?.id === rate.id}
          isRecommended={recommendedRate?.id === rate.id}
          onSelect={setSelectedRate}
        />
      ))}
    </div>
  );
};
