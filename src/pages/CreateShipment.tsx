
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Package, Truck, ArrowRight } from "lucide-react";
import easyPostService, { ShipmentResponse, SmartRate } from "@/services/easypostService";

const shipmentSchema = z.object({
  // From address fields
  fromName: z.string().min(1, "Name is required"),
  fromCompany: z.string().optional(),
  fromStreet1: z.string().min(1, "Street address is required"),
  fromStreet2: z.string().optional(),
  fromCity: z.string().min(1, "City is required"),
  fromState: z.string().min(1, "State is required"),
  fromZip: z.string().min(1, "Zip code is required"),
  fromCountry: z.string().min(1, "Country is required"),
  fromPhone: z.string().optional(),
  fromEmail: z.string().email("Invalid email address").optional(),
  
  // To address fields
  toName: z.string().min(1, "Name is required"),
  toCompany: z.string().optional(),
  toStreet1: z.string().min(1, "Street address is required"),
  toStreet2: z.string().optional(),
  toCity: z.string().min(1, "City is required"),
  toState: z.string().min(1, "State is required"),
  toZip: z.string().min(1, "Zip code is required"),
  toCountry: z.string().min(1, "Country is required"),
  toPhone: z.string().optional(),
  toEmail: z.string().email("Invalid email address").optional(),
  
  // Parcel fields
  length: z.coerce.number().min(0.1, "Length must be greater than 0"),
  width: z.coerce.number().min(0.1, "Width must be greater than 0"),
  height: z.coerce.number().min(0.1, "Height must be greater than 0"),
  weight: z.coerce.number().min(0.1, "Weight must be greater than 0"),
});

type ShipmentForm = z.infer<typeof shipmentSchema>;

const CreateShipment = () => {
  const [shipmentResponse, setShipmentResponse] = useState<ShipmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRate, setSelectedRate] = useState<SmartRate | null>(null);
  
  const form = useForm<ShipmentForm>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      // Default values for development
      fromName: "John Doe",
      fromCompany: "Ship Tornado",
      fromStreet1: "123 Main St",
      fromCity: "Boston",
      fromState: "MA",
      fromZip: "02108",
      fromCountry: "US",
      fromPhone: "555-123-4567",
      fromEmail: "john@shiptornado.com",
      
      toName: "Jane Smith",
      toStreet1: "456 Market St",
      toCity: "San Francisco",
      toState: "CA",
      toZip: "94103",
      toCountry: "US",
      
      length: 10,
      width: 8,
      height: 6,
      weight: 16,
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
      toast.success("Shipment rates retrieved successfully");
    } catch (error) {
      console.error("Error creating shipment:", error);
      toast.error("Failed to retrieve shipment rates");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePurchaseLabel = () => {
    if (!selectedRate) {
      toast.error("Please select a shipping rate first");
      return;
    }
    
    toast.success("Shipping label purchased successfully!");
    // In a real implementation, we would call the EasyPost API to purchase the label
  };
  
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
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Create Shipment</h1>
          <p className="text-muted-foreground">Create a new shipment with SmartRate</p>
        </div>
      </div>
      
      {!shipmentResponse ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="addresses" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
                <TabsTrigger value="package">Package Details</TabsTrigger>
                <TabsTrigger value="options">Shipping Options</TabsTrigger>
              </TabsList>
              
              <TabsContent value="addresses" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* From Address */}
                  <Card>
                    <CardHeader>
                      <CardTitle>From Address</CardTitle>
                      <CardDescription>Enter the sender's address information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fromName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fromCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="fromStreet1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fromStreet2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address 2 (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Apt, suite, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="fromCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="City" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="fromState"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input placeholder="State" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="fromZip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Zip code" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="fromCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="MX">Mexico</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fromPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="fromEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* To Address */}
                  <Card>
                    <CardHeader>
                      <CardTitle>To Address</CardTitle>
                      <CardDescription>Enter the recipient's address information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="toName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="toCompany"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="toStreet1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="toStreet2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address 2 (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Apt, suite, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="toCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="City" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="toState"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <FormControl>
                                <Input placeholder="State" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="toZip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Zip code" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="toCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="MX">Mexico</SelectItem>
                                <SelectItem value="GB">United Kingdom</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="toPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Phone number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="toEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="package" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Package Details</CardTitle>
                    <CardDescription>Enter the package dimensions and weight</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Dimensions</h3>
                          <span className="text-sm text-muted-foreground">in inches</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="length"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Length</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="width"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Width</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="height"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Height</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Weight</h3>
                          <span className="text-sm text-muted-foreground">in oz</span>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" {...field} />
                              </FormControl>
                              <FormDescription>
                                For packages over 1lb, enter 16oz per pound (e.g., 2lbs = 32oz)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="options" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Options</CardTitle>
                    <CardDescription>Additional shipping options and preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      This demo uses SmartRate to calculate shipping rates with time-in-transit data.
                      Additional options like insurance, signature confirmation, etc. would be configured here.
                    </p>
                  </CardContent>
                </Card>
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
        </Form>
      ) : (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Rates</CardTitle>
              <CardDescription>
                Select a shipping rate to continue. SmartRate provides estimated transit times and delivery accuracy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shipmentResponse.smartrates?.map((rate) => (
                  <div
                    key={rate.id}
                    className={`p-4 border rounded-md flex flex-col md:flex-row justify-between items-start md:items-center transition-colors cursor-pointer ${
                      selectedRate?.id === rate.id 
                        ? 'border-tms-blue bg-blue-50' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedRate(rate)}
                  >
                    <div className="flex items-center gap-3 mb-3 md:mb-0">
                      <div className={`h-5 w-5 rounded-full ${
                        selectedRate?.id === rate.id 
                          ? 'bg-tms-blue' 
                          : 'border border-muted-foreground'
                      }`}>
                        {selectedRate?.id === rate.id && (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          {rate.carrier} {rate.service}
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
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShipmentResponse(null)}
              >
                Back to Shipment Details
              </Button>
              
              <Button 
                className="bg-tms-blue hover:bg-tms-blue-400"
                disabled={!selectedRate}
                onClick={handlePurchaseLabel}
              >
                <Package className="mr-2 h-4 w-4" />
                Purchase Label
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </TmsLayout>
  );
};

export default CreateShipment;
