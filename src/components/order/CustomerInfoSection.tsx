import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { OrderFormValues } from "@/types/order";
import { useEffect } from "react";

export const CustomerInfoSection = () => {
  const form = useFormContext<OrderFormValues>();
  
  // Watch orderItems to auto-calculate items count and value
  const orderItems = form.watch("orderItems") || [];
  
  // Auto-calculate values whenever orderItems changes
  useEffect(() => {
    const totalItems = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = orderItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    
    form.setValue("items", totalItems);
    form.setValue("value", totalValue);
  }, [orderItems, form]);

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Customer Information</h3>
      
      <FormField
        name="customerName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer Name*</FormLabel>
            <FormControl>
              <Input placeholder="John Doe" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        name="customerCompany"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company</FormLabel>
            <FormControl>
              <Input placeholder="Company name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          name="customerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          name="customerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="(555) 555-5555" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          name="items"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Items (Auto-calculated)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  value={field.value || 0}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Value (Auto-calculated)</FormLabel>
              <FormControl>
                <Input 
                  value={`$${(field.value || 0).toFixed(2)}`}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        name="requiredDeliveryDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Required Delivery Date*</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};