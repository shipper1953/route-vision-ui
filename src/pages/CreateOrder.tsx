
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { CustomerInfoSection } from "@/components/order/CustomerInfoSection";
import { ShippingAddressSection } from "@/components/order/ShippingAddressSection";
import { OrderFormActions } from "@/components/order/OrderFormActions";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { orderFormSchema, OrderFormValues } from "@/types/order";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const CreateOrder = () => {
  const { isSubmitting, onSubmit } = useCreateOrder();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
        } else {
          // Redirect to login or show auth required message
          navigate("/login"); // Assuming you have a login page
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

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

  if (isLoading) {
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
