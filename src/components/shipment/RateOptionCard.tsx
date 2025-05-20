
import { useState } from "react";
import { Truck } from "lucide-react";
import { SmartRate } from "@/services/easypostService";

interface RateOptionCardProps {
  rate: SmartRate;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: (rate: SmartRate) => void;
}

export const RateOptionCard = ({ 
  rate, 
  isSelected, 
  isRecommended,
  onSelect 
}: RateOptionCardProps) => {
  const getDeliveryAccuracyLabel = (accuracy?: string) => {
    switch (accuracy) {
      case 'percentile_50':
        return '50%';
      case 'percentile_75':
        return '75%';
      case 'percentile_85':
        return '85%';
      case 'percentile_90':
        return '90%';
      case 'percentile_95':
        return '95%';
      case 'percentile_97':
        return '97%';
      case 'percentile_99':
        return '99%';
      default:
        return '--';
    }
  };

  return (
    <div
      className={`p-4 border rounded-md flex flex-col md:flex-row justify-between items-start md:items-center transition-colors cursor-pointer ${
        isSelected 
          ? 'border-tms-blue bg-blue-50' 
          : isRecommended
          ? 'border-green-400 bg-green-50'
          : 'border-border hover:bg-muted/50'
      }`}
      onClick={() => onSelect(rate)}
    >
      <div className="flex items-center gap-3 mb-3 md:mb-0">
        <div className={`h-5 w-5 rounded-full ${
          isSelected 
            ? 'bg-tms-blue' 
            : 'border border-muted-foreground'
        }`}>
          {isSelected && (
            <div className="h-full w-full flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-white"></div>
            </div>
          )}
        </div>
        
        <div>
          <div className="font-medium flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            {rate.carrier} {rate.service}
            {isRecommended && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Recommended
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Delivery in {rate.delivery_days} business day{rate.delivery_days !== 1 && 's'} 
            {rate.delivery_date && ` - Est. delivery ${new Date(rate.delivery_date).toLocaleDateString()}`}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Accuracy</div>
          <div className="font-medium">
            {getDeliveryAccuracyLabel(rate.delivery_accuracy)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Guaranteed</div>
          <div className="font-medium">
            {rate.delivery_date_guaranteed ? 'Yes' : 'No'}
          </div>
        </div>
        
        <div className="text-right font-bold text-lg text-tms-blue">
          ${rate.rate}
        </div>
      </div>
    </div>
  );
};
