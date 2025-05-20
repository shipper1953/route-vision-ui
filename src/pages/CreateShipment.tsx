
import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Package, Truck, ArrowRight, Barcode, Search } from "lucide-react";
import easyPostService, { ShipmentResponse, SmartRate } from "@/services/easypostService";
import { fetchOrderById } from "@/services/orderService";

const shipmentSchema = z.object({
  // Barcode field for order lookup
  orderBarcode: z.string().optional(),
  
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

  // Order details
  orderId: z.string().optional(),
  requiredDeliveryDate: z.string().optional(),
});

type ShipmentForm = z.infer<typeof shipmentSchema>;

const CreateShipment = () => {
  const [shipmentResponse, setShipmentResponse] = useState<ShipmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRate, setSelectedRate] = useState<SmartRate | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [orderLookupComplete, setOrderLookupComplete] = useState(false);
  const [recommendedRate, setRecommendedRate] = useState<SmartRate | null>(null);
  
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
  
  const handleLookupOrder = async () => {
    const orderBarcode = form.getValues("orderBarcode");
    
    if (!orderBarcode) {
      toast.error("Please enter a valid order barcode");
      return;
    }
    
    try {
      setLookupLoading(true);
      const order = await fetchOrderById(orderBarcode);
      
      if (!order) {
        toast.error("Order not found");
        return;
      }
      
      // Update form with order data
      form.setValue("toName", order.customerName);
      form.setValue("toCompany", order.customerCompany || "");
      form.setValue("toStreet1", order.shippingAddress.street1);
      form.setValue("toStreet2", order.shippingAddress.street2 || "");
      form.setValue("toCity", order.shippingAddress.city);
      form.setValue("toState", order.shippingAddress.state);
      form.setValue("toZip", order.shippingAddress.zip);
      form.setValue("toCountry", order.shippingAddress.country);
      form.setValue("toPhone", order.customerPhone || "");
      form.setValue("toEmail", order.customerEmail || "");
      
      // Set parcel dimensions and weight if available from Qboid system
      if (order.parcelInfo) {
        form.setValue("length", order.parcelInfo.length);
        form.setValue("width", order.parcelInfo.width);
        form.setValue("height", order.parcelInfo.height);
        form.setValue("weight", order.parcelInfo.weight);
      }
      
      // Set order details
      form.setValue("orderId", order.id);
      form.setValue("requiredDeliveryDate", order.requiredDeliveryDate);
      
      toast.success("Order information loaded");
      setOrderLookupComplete(true);
      
    } catch (error) {
      console.error("Error looking up order:", error);
      toast.error("Failed to retrieve order information");
    } finally {
      setLookupLoading(false);
    }
  };
  
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
  
  const handlePurchaseLabel = () => {
    if (!selectedRate) {
      toast.error("Please select a shipping rate first");
      return;
    }
    
    const orderId = form.getValues("orderId");
    
    toast.success("Shipping label purchased successfully!");
    // In a production implementation:
    // 1. Call the EasyPost API to purchase the label
    // 2. Update the order status
    // 3. Associate the shipment with the order
    
    // Navigate back to Orders page after short delay
    setTimeout(() => {
      window.location.href = orderId ? `/orders?highlight=${orderId}` : "/orders";
    }, 2000);
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
      
      {/* Barcode Scan Input */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5 text-tms-blue" />
            Order Lookup
          </CardTitle>
          <CardDescription>
            Scan or enter order barcode to automatically populate shipment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <FormField
                control={form.control}
                name="orderBarcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Barcode or ID</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Scan or enter order barcode"
                          className="pl-10"
                          {...field}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleLookupOrder();
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Hit enter or click lookup to retrieve order details
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="button"
              onClick={handleLookupOrder}
              className="bg-tms-blue hover:bg-tms-blue-400 mb-6"
              disabled={lookupLoading}
            >
              {lookupLoading ? (
                <>
                  <LoadingSpinner size={16} className="mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Lookup Order
                </>
              )}
            </Button>
          </div>
          
          {orderLookupComplete && form.getValues("requiredDeliveryDate") && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center gap-2 text-amber-800">
                <Truck className="h-4 w-4" />
                <span className="font-medium">Required Delivery:</span>
                <span>{new Date(form.getValues("requiredDeliveryDate")).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
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
                    
                    {form.getValues("orderId") && (
                      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          Package data populated from Qboid scanning system for order #{form.getValues("orderId")}
                        </p>
                      </div>
                    )}
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
                {form.getValues("requiredDeliveryDate") && (
                  <span className="block mt-1 font-medium">
                    Required delivery date: {new Date(form.getValues("requiredDeliveryDate")).toLocaleDateString()}
                  </span>
                )}
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
                        : recommendedRate?.id === rate.id
                        ? 'border-green-400 bg-green-50'
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
                          {recommendedRate?.id === rate.id && (
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
