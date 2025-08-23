import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingDown, 
  Package, 
  Truck, 
  Clock, 
  DollarSign,
  BarChart3,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { EnhancedRateResponse, EnhancedQuote } from "@/services/strategicRateShoppingService";

interface StrategicRateShoppingResultsProps {
  results: EnhancedRateResponse;
  onSelectRate: (quote: EnhancedQuote) => void;
  selectedQuoteId?: string;
}

export const StrategicRateShoppingResults = ({ 
  results, 
  onSelectRate,
  selectedQuoteId 
}: StrategicRateShoppingResultsProps) => {
  
  const getCarrierIcon = (carrier: string) => {
    const carrierLower = carrier.toLowerCase();
    if (['ups', 'fedex', 'usps', 'dhl'].includes(carrierLower)) {
      return <Package className="h-4 w-4" />;
    }
    return <Truck className="h-4 w-4" />;
  };

  const getQuoteTypeColor = (type: 'parcel' | 'freight') => {
    return type === 'parcel' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getEstimatedDaysColor = (days?: number) => {
    if (!days) return 'text-muted-foreground';
    if (days <= 2) return 'text-green-600';
    if (days <= 3) return 'text-blue-600';
    return 'text-orange-600';
  };

  const totalSavings = results.quotes.length > 1 ? 
    Math.max(...results.quotes.map(q => q.rate)) - Math.min(...results.quotes.map(q => q.rate)) : 0;

  const avgRate = results.quotes.reduce((sum, q) => sum + q.rate, 0) / results.quotes.length;

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <Card className="border-tms-blue/20 bg-gradient-to-r from-tms-blue/5 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-tms-blue" />
            Strategic Rate Shopping Results
          </CardTitle>
          <CardDescription>
            Intelligent multi-carrier comparison for {results.package_count} packages ({results.total_weight}lbs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-tms-blue">{results.total_options}</div>
              <div className="text-sm text-muted-foreground">Rate Options</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${totalSavings.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Max Savings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">${avgRate.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Avg Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{results.package_count}</div>
              <div className="text-sm text-muted-foreground">Packages</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            {results.strategy_used.parcel && (
              <Badge variant="outline" className="gap-1">
                <Package className="h-3 w-3" />
                Parcel Checked
              </Badge>
            )}
            {results.strategy_used.freight && (
              <Badge variant="outline" className="gap-1">
                <Truck className="h-3 w-3" />
                Freight Checked
              </Badge>
            )}
            {results.strategy_used.hybrid && (
              <Badge variant="outline" className="gap-1">
                <BarChart3 className="h-3 w-3" />
                Hybrid Analysis
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cheapest Option Highlight */}
      {results.cheapest_option && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <TrendingDown className="h-5 w-5" />
              Recommended: Cheapest Option
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getCarrierIcon(results.cheapest_option.carrier)}
                <div>
                  <div className="font-semibold text-green-800">
                    {results.cheapest_option.carrier.toUpperCase()} {results.cheapest_option.service}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className={getQuoteTypeColor(results.cheapest_option.quote_type)}>
                      {results.cheapest_option.quote_type.toUpperCase()}
                    </Badge>
                    {results.cheapest_option.estimated_days && (
                      <span className={`flex items-center gap-1 ${getEstimatedDaysColor(results.cheapest_option.estimated_days)}`}>
                        <Clock className="h-3 w-3" />
                        {results.cheapest_option.estimated_days} days
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${results.cheapest_option.rate.toFixed(2)}
                </div>
                <Button 
                  onClick={() => onSelectRate(results.cheapest_option!)}
                  className="mt-2 bg-green-600 hover:bg-green-700"
                >
                  Select Best Rate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Rate Options */}
      <Card>
        <CardHeader>
          <CardTitle>All Rate Options</CardTitle>
          <CardDescription>
            Complete comparison of available shipping rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.quotes.map((quote, index) => {
              const isSelected = selectedQuoteId === `${quote.carrier}-${quote.service}`;
              const isCheapest = index === 0;
              const savingsVsCheapest = quote.rate - results.quotes[0].rate;
              const efficiencyScore = ((avgRate - quote.rate) / avgRate) * 100;

              return (
                <div
                  key={`${quote.carrier}-${quote.service}`}
                  className={`p-4 rounded-lg border transition-all ${
                    isSelected 
                      ? 'border-tms-blue bg-tms-blue/5' 
                      : isCheapest
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCarrierIcon(quote.carrier)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {quote.carrier.toUpperCase()} {quote.service}
                          </span>
                          {isCheapest && (
                            <Badge variant="default" className="bg-green-600">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Best Rate
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge variant="default" className="bg-tms-blue">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <Badge className={getQuoteTypeColor(quote.quote_type)}>
                            {quote.quote_type.toUpperCase()}
                          </Badge>
                          {quote.estimated_days && (
                            <span className={`flex items-center gap-1 ${getEstimatedDaysColor(quote.estimated_days)}`}>
                              <Clock className="h-3 w-3" />
                              {quote.estimated_days} days
                            </span>
                          )}
                          {efficiencyScore > 0 && (
                            <span className="text-green-600">
                              {efficiencyScore.toFixed(1)}% below average
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${quote.rate.toFixed(2)}
                      </div>
                      {savingsVsCheapest > 0 && (
                        <div className="text-sm text-orange-600">
                          +${savingsVsCheapest.toFixed(2)} vs best
                        </div>
                      )}
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSelectRate(quote)}
                        className="mt-2"
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                    </div>
                  </div>

                  {/* Efficiency Bar */}
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>Value Score</span>
                      <span className="ml-auto">{Math.max(0, efficiencyScore).toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={Math.max(0, Math.min(100, efficiencyScore + 50))} 
                      className="h-2"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {results.strategy_used.parcel && (
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span>Parcel carriers evaluated for standard package shipping</span>
              </div>
            )}
            {results.strategy_used.freight && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-green-600" />
                <span>Freight options considered for heavy/oversized shipment</span>
              </div>
            )}
            {results.package_count > 5 && (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-600" />
                <span>Multi-package optimization may provide additional savings</span>
              </div>
            )}
            {totalSavings > 20 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>Significant cost variation detected - carrier selection matters</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};