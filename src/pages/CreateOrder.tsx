
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { CustomerInfoSection } from "@/components/order/CustomerInfoSection";
import { ShippingAddressSection } from "@/components/order/ShippingAddressSection";
import { OrderItemsSection } from "@/components/order/OrderItemsSection";
import { WarehouseSelectionSection } from "@/components/order/WarehouseSelectionSection";
import { OrderFormActions } from "@/components/order/OrderFormActions";
import { orderFormSchema, OrderFormValues } from "@/types/order";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/context";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useDefaultAddressValues } from "@/hooks/useDefaultAddressValues";
import { useEffect } from "react";

const CreateOrder = () => {
  const { isAuthenticated, loading, userProfile } = useAuth();
  const { isSubmitting, onSubmit } = useCreateOrder();
  const { warehouseAddress } = useDefaultAddressValues();
  const [searchParams] = useSearchParams();

  // Initialize the form with the correct type
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerCompany: "",
      customerEmail: "",
      customerPhone: "",
      requiredDeliveryDate: undefined,
      orderItems: [],
      street1: "",
      street2: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
      warehouseId: "",
    },
  });

  // Handle copying order data from URL params
  useEffect(() => {
    const copyData = searchParams.get('copy');
    if (copyData) {
      try {
        const orderData = JSON.parse(decodeURIComponent(copyData));
        
        // Pre-fill form with copied order data
        if (orderData.customerName) form.setValue("customerName", orderData.customerName);
        if (orderData.customerCompany) form.setValue("customerCompany", orderData.customerCompany);
        if (orderData.customerEmail) form.setValue("customerEmail", orderData.customerEmail);
        if (orderData.customerPhone) form.setValue("customerPhone", orderData.customerPhone);
        
        // Pre-fill shipping address
        if (orderData.shippingAddress) {
          const addr = orderData.shippingAddress;
          if (addr.street1) form.setValue("street1", addr.street1);
          if (addr.street2) form.setValue("street2", addr.street2);
          if (addr.city) form.setValue("city", addr.city);
          if (addr.state) form.setValue("state", addr.state);
          if (addr.zip) form.setValue("zip", addr.zip);
          if (addr.country) form.setValue("country", addr.country);
        }
        
        // Pre-fill items if they're in array format
        if (orderData.items && Array.isArray(orderData.items)) {
          const formattedItems = orderData.items.map((item: any) => ({
            itemId: item.itemId || "",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0
          }));
          form.setValue("orderItems", formattedItems);
        }
      } catch (error) {
        console.error("Failed to parse copied order data:", error);
      }
    }
  }, [searchParams, form]);

  // Set default warehouse when warehouse address is loaded
  useEffect(() => {
    if (warehouseAddress && userProfile?.warehouse_ids && Array.isArray(userProfile.warehouse_ids) && userProfile.warehouse_ids.length > 0) {
      form.setValue("warehouseId", userProfile.warehouse_ids[0]);
    }
  }, [warehouseAddress, userProfile?.warehouse_ids, form]);

  if (loading) {
    return (
      <TmsLayout>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size={24} />
        </div>
      </TmsLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <TmsLayout>
        <div className="flex justify-center items-center py-8">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>You must be logged in to create orders.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </TmsLayout>
    );
  }

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Create Order</h1>
          <p className="text-muted-foreground">Add a new customer order with items</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Order</CardTitle>
          <CardDescription>Enter the order details and select items from your catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CustomerInfoSection />
                <ShippingAddressSection />
              </div>
              <OrderItemsSection />
              <WarehouseSelectionSection />
              <OrderFormActions isSubmitting={isSubmitting} />
            </form>
          </Form>
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default CreateOrder;
