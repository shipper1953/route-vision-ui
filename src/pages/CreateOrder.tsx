import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { CustomerInfoSection } from "@/components/order/CustomerInfoSection";
import { ShippingAddressSection } from "@/components/order/ShippingAddressSection";
import { OrderFormActions } from "@/components/order/OrderFormActions";
import { orderFormSchema, OrderFormValues } from "@/types/order";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const CreateOrder = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form with the correct type
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerCompany: "",
      customerEmail: "",
      customerPhone: "",
      requiredDeliveryDate: undefined,
      items: 1,
      value: "",
      street1: "",
      street2: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
    },
  });

  const onSubmit = async (values: OrderFormValues) => {
    setIsSubmitting(true);
    // Prepare order data for Supabase
    const orderData = {
      customer_name: values.customerName,
      customer_company: values.customerCompany,
      customer_email: values.customerEmail,
      customer_phone: values.customerPhone,
      required_delivery_date: values.requiredDeliveryDate,
      items: values.items,
      value: values.value,
      shipping_address: {
        street1: values.street1,
        street2: values.street2,
        city: values.city,
        state: values.state,
        zip: values.zip,
        country: values.country,
      },
      status: "ready_to_ship",
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("orders").insert([orderData]);
    if (error) {
      toast.error("Failed to create order: " + error.message);
    } else {
      toast.success("Order created successfully!");
      navigate("/orders");
    }
    setIsSubmitting(false);
  };

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
          <p className="text-muted-foreground">Add a new customer order</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Order</CardTitle>
          <CardDescription>Enter the order details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CustomerInfoSection />
                <ShippingAddressSection />
              </div>
              <OrderFormActions isSubmitting={isSubmitting} />
            </form>
          </Form>
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default CreateOrder;