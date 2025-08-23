import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Truck, 
  BarChart3, 
  AlertCircle,
  TrendingUp,
  Clock
} from "lucide-react";
import { AddressFormSection } from "./AddressFormSection";
import { PackageDetailsSection } from "./PackageDetailsSection";
import { StrategicRateShoppingResults } from "./StrategicRateShoppingResults";
import { useStrategicRateShopping } from "@/hooks/useStrategicRateShoppingHook";
import { EnhancedShipmentData } from "@/services/strategicRateShoppingService";

interface EnhancedShipmentFormProps {
  onShipmentCreated?: (response: any) => void;
  initialOrderId?: string;
}

export const EnhancedShipmentForm = ({ 
  onShipmentCreated,
  initialOrderId 
}: EnhancedShipmentFormProps) => {
  const [currentStep, setCurrentStep] = useState<'form' | 'rates'>('form');
  const form = useForm();
  const {
    loading,
    rateResponse,
    selectedQuote,
    getStrategicRates,
    selectQuote,
    getShipmentAnalysis,
    calculateSavings,
    hasRates,
    totalOptions,
    strategyUsed
  } = useStrategicRateShopping();

  const handleFormSubmit = async (data: any) => {
    console.log('Enhanced shipment form submitted:', data);
    
    // Transform form data to match API expectations
    const shipmentData: Omit<EnhancedShipmentData, 'company_id' | 'user_id'> = {
      from_address: {
        street1: data.fromAddress?.street || '',
        street2: data.fromAddress?.street2 || '',
        city: data.fromAddress?.city || '',
        state: data.fromAddress?.state || '',
        zip: data.fromAddress?.zip || '',
        country: data.fromAddress?.country || 'US'
      },
      to_address: {
        street1: data.toAddress?.street || '',
        street2: data.toAddress?.street2 || '',
        city: data.toAddress?.city || '',
        state: data.toAddress?.state || '',
        zip: data.toAddress?.zip || '',
        country: data.toAddress?.country || 'US'
      },
      packages: data.packages || [{
        length: data.dimensions?.length || 12,
        width: data.dimensions?.width || 10,
        height: data.dimensions?.height || 8,
        weight: data.dimensions?.weight || 5,
        description: 'Package'
      }]
    };

    // Get strategic rates
    const response = await getStrategicRates(shipmentData);
    
    if (response) {
      setCurrentStep('rates');
      onShipmentCreated?.(response);
    }
  };

  const handleQuoteSelection = async (quote: any) => {
    const success = await selectQuote(quote);
    if (success && onShipmentCreated) {
      // You could trigger label purchase or other next steps here
    }
  };

  const getComplexityAnalysis = () => {
    const formData = form.getValues();
    const packages = formData.packages || [{
      length: formData.dimensions?.length || 12,
      width: formData.dimensions?.width || 10,
      height: formData.dimensions?.height || 8,
      weight: formData.dimensions?.weight || 5
    }];
    
    return getShipmentAnalysis(packages);
  };

  if (currentStep === 'rates' && rateResponse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep('form')}
          >
            ← Back to Form
          </Button>
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            Shipment #{rateResponse.shipment_id}
          </Badge>
        </div>

        <StrategicRateShoppingResults
          results={rateResponse}
          onSelectRate={handleQuoteSelection}
          selectedQuoteId={selectedQuote ? `${selectedQuote.carrier}-${selectedQuote.service}` : undefined}
        />
      </div>
    );
  }

  const complexity = getComplexityAnalysis();

  return (
    <div className="space-y-6">
      {/* Strategic Intelligence Header */}
      <Card className="border-tms-blue/20 bg-gradient-to-r from-tms-blue/5 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-tms-blue" />
            Strategic Multi-Carrier Rate Shopping
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Intelligent routing across parcel and freight carriers for optimal rates
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {complexity.metrics.totalPackages || 1}
              </div>
              <div className="text-xs text-muted-foreground">Packages</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {complexity.metrics.totalWeight?.toFixed(1) || '0.0'}lbs
              </div>
              <div className="text-xs text-muted-foreground">Total Weight</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${
                complexity.complexity === 'simple' ? 'text-green-600' :
                complexity.complexity === 'moderate' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {complexity.complexity}
              </div>
              <div className="text-xs text-muted-foreground">Complexity</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">
                {complexity.recommendations.useParcel && complexity.recommendations.useFreight ? 'Hybrid' :
                 complexity.recommendations.useFreight ? 'Freight' : 'Parcel'}
              </div>
              <div className="text-xs text-muted-foreground">Strategy</div>
            </div>
          </div>

          {/* Strategy Recommendations */}
          <div className="mt-4 flex gap-2 flex-wrap">
            {complexity.recommendations.useParcel && (
              <Badge variant="outline" className="gap-1">
                <Package className="h-3 w-3" />
                Parcel Carriers
              </Badge>
            )}
            {complexity.recommendations.useFreight && (
              <Badge variant="outline" className="gap-1">
                <Truck className="h-3 w-3" />
                Freight Options
              </Badge>
            )}
            {complexity.recommendations.consolidationOpportunity && (
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Consolidation Opportunity
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Tabs */}
      <Tabs defaultValue="addresses" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>

        <TabsContent value="addresses" className="space-y-6">
          <AddressFormSection 
            type="from"
            title="Origin Address"
            description="Where is this shipment being sent from?"
          />
          <AddressFormSection 
            type="to"
            title="Destination Address"
            description="Where is this shipment being delivered?"
          />
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <PackageDetailsSection orderItems={[]} />
        </TabsContent>

        <TabsContent value="options" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Shipping Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Strategic rate shopping will automatically evaluate:
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    Parcel carriers (UPS, FedEx, USPS) for standard shipments
                  </li>
                  <li className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    Freight carriers (LTL) for heavy or oversized shipments
                  </li>
                  <li className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    Multi-piece discounts and consolidation opportunities
                  </li>
                  <li className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    Real-time rate comparison across all options
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          onClick={form.handleSubmit(handleFormSubmit)}
          disabled={loading}
          size="lg"
          className="gap-2 min-w-48"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Getting Strategic Rates...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              Get Strategic Rates
            </>
          )}
        </Button>
      </div>

      {/* Complexity Insights */}
      {complexity.complexity !== 'simple' && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <div className="font-medium text-orange-800 mb-2">
                  {complexity.complexity === 'complex' ? 'Complex Shipment Detected' : 'Moderate Complexity Shipment'}
                </div>
                <div className="text-sm text-orange-700 space-y-1">
                  {complexity.recommendations.useFreight && (
                    <div>• Freight carriers will be evaluated for better rates</div>
                  )}
                  {complexity.recommendations.consolidationOpportunity && (
                    <div>• Consolidation opportunities may reduce costs</div>
                  )}
                  {complexity.metrics.maxDimension > 96 && (
                    <div>• Oversized package may require special handling</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};