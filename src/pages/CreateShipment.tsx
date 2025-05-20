
import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import easyPostService, { ShipmentResponse, SmartRate } from "@/services/easypostService";
import { OrderLookupCard } from "@/components/shipment/OrderLookupCard";
import { AddressFormSection } from "@/components/shipment/AddressFormSection";
import { PackageDetailsSection } from "@/components/shipment/PackageDetailsSection";
import { ShippingOptionsSection } from "@/components/shipment/ShippingOptionsSection";
import { ShippingRatesCard } from "@/components/shipment/ShippingRatesCard";
import { shipmentSchema, ShipmentForm } from "@/types/shipment";

const CreateShipment = () => {
  const [shipmentResponse, setShipmentResponse] = useState<ShipmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRate, setSelectedRate] = useState<SmartRate | null>(null);
  const [orderLookupComplete, setOrderLookupComplete] = useState(false);
  const [recommendedRate, setRecommendedRate] = useState<SmartRate | null>(null);
  
  // Load default shipping address from localStorage
  const getDefaultShippingAddress = () => {
    return {
      fromName: localStorage.getItem("fromName") || "John Doe",
      fromCompany: localStorage.getItem("fromCompany") || "Ship Tornado",
      fromStreet1: localStorage.getItem("fromStreet1") || "123 Main St",
      fromStreet2: localStorage.getItem("fromStreet2") || "",
      fromCity: localStorage.getItem("fromCity") || "Boston",
      fromState: localStorage.getItem("fromState") || "MA",
      fromZip: localStorage.getItem("fromZip") || "02108",
      fromCountry: localStorage.getItem("fromCountry") || "US",
      fromPhone: localStorage.getItem("fromPhone") || "555-123-4567",
      fromEmail: localStorage.getItem("fromEmail") || "john@shiptornado.com",
    };
  };
  
  const form = useForm<ShipmentForm>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      // Load default shipping address from profile settings
      ...getDefaultShippingAddress(),
      
      // Default values for recipient
      toName: "",
      toStreet1: "",
      toCity: "",
      toState: "",
      toZip: "",
      toCountry: "US",
      
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      
      orderBarcode: "",
      orderId: "",
      requiredDeliveryDate: "",
    }
  });
  
  const onSubmit = async (data: ShipmentForm) => {
    try {
      setLoading(true);
      
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
        }
      };
      
      const response = await easyPostService.createShipment(shipmentData);
      setShipmentResponse(response);
      
      // Find recommended rate based on required delivery date
      if (data.requiredDeliveryDate) {
        const requiredDate = new Date(data.requiredDeliveryDate);
        
        // Find a rate that can deliver by the required date
        if (response.smartrates) {
          const recommendedOptions = response.smartrates.filter(rate => {
            if (!rate.delivery_date) return false;
            const deliveryDate = new Date(rate.delivery_date);
            return deliveryDate <= requiredDate;
          });
          
          if (recommendedOptions.length > 0) {
            // Sort by price (lowest first) from rates that meet the deadline
            const bestRate = recommendedOptions.sort((a, b) => 
              parseFloat(a.rate) - parseFloat(b.rate)
            )[0];
            
            setRecommendedRate(bestRate);
            setSelectedRate(bestRate);
            
            toast.success("Recommended shipping option selected based on required delivery date");
          } else {
            toast.warning("No shipping options available to meet the required delivery date");
          }
        }
      }
      
      toast.success("Shipment rates retrieved successfully");
    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error("Failed to retrieve shipment rates");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Create Shipment</h1>
          <p className="text-muted-foreground">Create a new shipment with SmartRate</p>
        </div>
      </div>
      
      <FormProvider {...form}>
        <OrderLookupCard setOrderLookupComplete={setOrderLookupComplete} />
        
        {!shipmentResponse ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="addresses" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
                <TabsTrigger value="package">Package Details</TabsTrigger>
                <TabsTrigger value="options">Shipping Options</TabsTrigger>
              </TabsList>
              
              <TabsContent value="addresses" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <AddressFormSection 
                    type="from" 
                    title="From Address" 
                    description="Enter the sender's address information"
                  />
                  <AddressFormSection 
                    type="to" 
                    title="To Address" 
                    description="Enter the recipient's address information"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="package" className="mt-6">
                <PackageDetailsSection />
              </TabsContent>
              
              <TabsContent value="options" className="mt-6">
                <ShippingOptionsSection />
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-tms-blue hover:bg-tms-blue-400"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size={16} className="mr-2" /> 
                    Getting Rates...
                  </>
                ) : (
                  <>
                    Get Shipping Rates
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-8">
            <ShippingRatesCard 
              shipmentResponse={shipmentResponse}
              selectedRate={selectedRate}
              setSelectedRate={setSelectedRate}
              recommendedRate={recommendedRate}
              onBack={() => setShipmentResponse(null)}
            />
          </div>
        )}
      </FormProvider>
    </TmsLayout>
  );
};

export default CreateShipment;
