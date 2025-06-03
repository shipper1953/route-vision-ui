
import { useState } from "react";
import { Truck, Clock, Shield, CheckCircle, DollarSign } from "lucide-react";
import { SmartRate, Rate } from "@/services/easypost";
import { MarkedUpRate, MarkedUpSmartRate } from "@/utils/rateMarkupUtils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context";

interface RateOptionCardProps {
  rate: SmartRate | Rate | MarkedUpRate | MarkedUpSmartRate;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: (rate: SmartRate | Rate) => void;
}

export const RateOptionCard = ({ 
  rate, 
  isSelected, 
  isRecommended,
  onSelect 
}: RateOptionCardProps) => {
  const { isSuperAdmin } = useAuth();
  
  // Check if rate is a SmartRate by looking for SmartRate-specific properties
  const isSmartRate = 'delivery_accuracy' in rate || 'delivery_date_guaranteed' in rate;
  
  // Check if rate has markup applied
  const hasMarkup = 'original_rate' in rate && 'markup_applied' in rate;
  
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

  // Format delivery date nicely
  const formatDeliveryDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Calculate tooltip text for delivery accuracy
  const getAccuracyTooltip = (accuracy?: string) => {
    if (!accuracy) return "No accuracy data available";
    
    return `${accuracy.replace('percentile_', '')}% confidence in delivery time estimate`;
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
              <Badge className="ml-2 bg-green-500">Recommended</Badge>
            )}
            {isSmartRate && (rate as SmartRate).delivery_date_guaranteed && (
              <Badge className="ml-2 bg-blue-500" title="Delivery date is guaranteed by carrier">
                <Shield className="h-3 w-3 mr-1" /> Guaranteed
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {rate.delivery_days && 
                <span>{rate.delivery_days} business day{rate.delivery_days !== 1 ? 's' : ''}</span>
              }
              {isSmartRate && (rate as SmartRate).delivery_date && 
                <span>Delivery by {formatDeliveryDate((rate as SmartRate).delivery_date)}</span>
              }
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
        {isSmartRate && (
          <div className="text-center px-3 py-1 bg-blue-50 rounded-full" title={getAccuracyTooltip((rate as SmartRate).delivery_accuracy)}>
            <div className="text-xs text-blue-700 font-medium flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              {getDeliveryAccuracyLabel((rate as SmartRate).delivery_accuracy)} Accuracy
            </div>
          </div>
        )}
        
        <div className="text-right">
          <div className="font-bold text-lg text-tms-blue">
            ${parseFloat(rate.rate).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Shipping Cost
          </div>
          {/* Only show base rate info to super admins */}
          {isSuperAdmin && hasMarkup && (rate as MarkedUpRate).markup_applied > 0 && (
            <div className="text-xs text-orange-600 flex items-center gap-1 mt-1">
              <DollarSign className="h-3 w-3" />
              Base: ${parseFloat((rate as MarkedUpRate).original_rate).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
