
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent 
} from "@/components/ui/card";
import {
  FormField,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Barcode, Search, Truck } from "lucide-react";
import { toast } from "sonner";
import { fetchOrderById } from "@/services/orderService";
import { ShipmentForm } from "@/types/shipment";
import { OrderAutocomplete } from "./OrderAutocomplete";
import { OrderData } from "@/types/orderTypes";

interface OrderLookupCardProps {
  setOrderLookupComplete: (value: boolean) => void;
  setOrderItems: (items: any[]) => void;
}

export const OrderLookupCard = ({ setOrderLookupComplete, setOrderItems }: OrderLookupCardProps) => {
  const [lookupLoading, setLookupLoading] = useState(false);
  const form = useFormContext<ShipmentForm>();

  const handleOrderSelected = async (order: OrderData) => {
    console.log("Order selected from autocomplete:", order);
    
    // Set the orderBarcode field to display the order ID
    form.setValue("orderBarcode", order.id);
    
    // Update form with customer data
    form.setValue("toName", order.customerName);
    form.setValue("toCompany", order.customerCompany || "");
    form.setValue("toPhone", order.customerPhone || "");
    form.setValue("toEmail", order.customerEmail || "");
    
    // Properly map shipping address fields from the order
    if (order.shippingAddress && Object.keys(order.shippingAddress).length > 0) {
      console.log("Setting shipping address from selected order:", order.shippingAddress);
      form.setValue("toStreet1", order.shippingAddress.street1 || "");
      form.setValue("toStreet2", order.shippingAddress.street2 || "");
      form.setValue("toCity", order.shippingAddress.city || "");
      form.setValue("toState", order.shippingAddress.state || "");
      form.setValue("toZip", order.shippingAddress.zip || "");
      form.setValue("toCountry", order.shippingAddress.country || "US");
    }
    
    // Set parcel dimensions and weight if available
    if (order.parcelInfo && Object.keys(order.parcelInfo).length > 0) {
      console.log("Setting parcel info from selected order:", order.parcelInfo);
      form.setValue("length", order.parcelInfo.length || 0);
      form.setValue("width", order.parcelInfo.width || 0);
      form.setValue("height", order.parcelInfo.height || 0);
      form.setValue("weight", order.parcelInfo.weight || 0);
    }
    
    // Set order details
    form.setValue("orderId", order.id);
    form.setValue("requiredDeliveryDate", order.requiredDeliveryDate);
    
    // Pass order items to parent component if items exist
    if (order.items && Array.isArray(order.items)) {
      console.log("OrderLookupCard - Setting order items for packaging optimization:", order.items);
      setOrderItems(order.items);
    } else {
      console.log("OrderLookupCard - No valid items array found in order:", {
        hasItems: !!order.items,
        itemsType: typeof order.items,
        itemsValue: order.items
      });
      setOrderItems([]);
    }
    
    toast.success("Order information loaded");
    setOrderLookupComplete(true);
  };

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
      
      await handleOrderSelected(order);
      
    } catch (error) {
      console.error("Error looking up order:", error);
      toast.error("Failed to retrieve order information");
    } finally {
      setLookupLoading(false);
    }
  };
  
  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Barcode className="h-5 w-5 text-tms-blue" />
          Order Lookup
        </CardTitle>
        <CardDescription>
          Select from open orders or enter order barcode to automatically populate shipment details
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
                    <OrderAutocomplete onOrderSelected={handleOrderSelected} />
                  </FormControl>
                  <FormDescription>
                    Select from the dropdown or enter order barcode manually
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
        
        {form.getValues("requiredDeliveryDate") && setOrderLookupComplete && (
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
  );
};
