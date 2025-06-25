
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Form } from "@/components/ui/form";
import { CustomerInfoSection } from "@/components/order/CustomerInfoSection";
import { ShippingAddressSection } from "@/components/order/ShippingAddressSection";
import { OrderItemsSection } from "@/components/order/OrderItemsSection";
import { WarehouseSelectionSection } from "@/components/order/WarehouseSelectionSection";
import { fetchOrderById, OrderData } from "@/services/orderService";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { orderFormSchema, OrderFormValues } from "@/types/order";
import { useUpdateOrder } from "@/hooks/useUpdateOrder";

const EditOrder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSubmitting, onSubmit } = useUpdateOrder(id || "");

  // Initialize the form
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

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) {
        toast.error("Invalid order ID");
        navigate("/orders");
        return;
      }

      try {
        setLoading(true);
        const orderData = await fetchOrderById(id);
        if (!orderData) {
          toast.error("Order not found");
          navigate("/orders");
          return;
        }
        
        if (orderData.status !== 'ready_to_ship') {
          toast.error("Only orders with 'ready to ship' status can be edited");
          navigate("/orders");
          return;
        }
        
        setOrder(orderData);

        // Pre-populate the form with existing order data
        form.setValue("customerName", orderData.customerName);
        form.setValue("customerCompany", orderData.customerCompany || "");
        form.setValue("customerEmail", orderData.customerEmail || "");
        form.setValue("customerPhone", orderData.customerPhone || "");
        form.setValue("requiredDeliveryDate", new Date(orderData.requiredDeliveryDate));
        
        // Convert legacy items data to orderItems array if needed
        // For now, initialize with empty array - this could be enhanced to parse existing items
        form.setValue("orderItems", []);
        
        // Set shipping address
        if (orderData.shippingAddress) {
          form.setValue("street1", orderData.shippingAddress.street1 || "");
          form.setValue("street2", orderData.shippingAddress.street2 || "");
          form.setValue("city", orderData.shippingAddress.city || "");
          form.setValue("state", orderData.shippingAddress.state || "");
          form.setValue("zip", orderData.shippingAddress.zip || "");
          form.setValue("country", orderData.shippingAddress.country || "US");
        }
        
      } catch (error) {
        console.error("Error loading order:", error);
        toast.error("Failed to load order");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id, navigate, form]);

  if (loading) {
    return (
      <TmsLayout>
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size={24} />
        </div>
      </TmsLayout>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-tms-blue">Edit Order {order.id}</h1>
            <p className="text-muted-foreground">Update the order details below</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Order</CardTitle>
          <CardDescription>Update the order details below.</CardDescription>
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
              
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/orders")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-tms-blue hover:bg-tms-blue-400">
                  {isSubmitting ? "Updating..." : "Update Order"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </TmsLayout>
  );
};

export default EditOrder;
