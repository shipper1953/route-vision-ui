
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { CustomerInfoSection } from "@/components/order/CustomerInfoSection";
import { ShippingAddressSection } from "@/components/order/ShippingAddressSection";
import { OrderFormActions } from "@/components/order/OrderFormActions";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { orderFormSchema, OrderFormValues } from "@/types/order";

const CreateOrder = () => {
  const { isSubmitting, onSubmit } = useCreateOrder();

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
          <FormProvider {...form}>
            <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CustomerInfoSection />
                <ShippingAddressSection />
              </div>
              
              <OrderFormActions isSubmitting={isSubmitting} />
            </Form>
          </FormProvider>
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default CreateOrder;
