
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OrderFormValues } from "@/types/order";
import { createOrder } from "@/services/orderCreationService";
import { useAuth } from "@/context";
import { useItemMaster } from "@/hooks/useItemMaster";

export const useCreateOrder = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { items } = useItemMaster();
  console.log("Available items in useCreateOrder:", items);

  const onSubmit = async (data: OrderFormValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to create an order");
      return;
    }

    if (!data.warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    if (data.orderItems.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }

    setIsSubmitting(true);
    console.log("Order form data:", data);
    
    try {
      // Format the date for the API
      const formattedDate = data.requiredDeliveryDate.toISOString().split('T')[0];
      
      // Calculate total items count and value
      const totalItems = data.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = data.orderItems.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0);
      
      // Prepare order items with item details for dimensions
      const orderItemsWithDetails = data.orderItems.map(orderItem => {
        console.log("Looking for item with ID:", orderItem.itemId, "in items:", items.map(i => ({ id: i.id, name: i.name })));
        const itemDetails = items.find(item => item.id === orderItem.itemId);
        console.log("Creating order item with details:", { orderItem, itemDetails });
        return {
          itemId: orderItem.itemId,
          quantity: orderItem.quantity,
          unitPrice: orderItem.unitPrice || 0,
          name: itemDetails?.name || 'Unknown Item',
          sku: itemDetails?.sku || '',
          dimensions: itemDetails ? {
            length: itemDetails.length,
            width: itemDetails.width,
            height: itemDetails.height,
            weight: itemDetails.weight
          } : null
        };
      });
      
      console.log("Order items with details prepared:", orderItemsWithDetails);
      
      // Create the order using the proper service
      const newOrder = await createOrder({
        customerName: data.customerName,
        customerCompany: data.customerCompany || undefined,
        customerEmail: data.customerEmail || undefined,
        customerPhone: data.customerPhone || undefined,
        orderDate: new Date().toISOString().split('T')[0], // Today's date
        requiredDeliveryDate: formattedDate,
        status: "ready_to_ship",
        items: totalItems,
        value: totalValue.toString(),
        warehouseId: data.warehouseId, // Pass the selected warehouse ID
        orderItems: orderItemsWithDetails, // Include detailed items for cartonization
        shippingAddress: {
          street1: data.street1,
          street2: data.street2 || undefined,
          city: data.city,
          state: data.state,
          zip: data.zip,
          country: data.country
        }
      });
      
      toast.success(`Order ${newOrder.id} created successfully!`);
      
      // Navigate back to orders page with highlight
      navigate(`/orders?highlight=${newOrder.id}`);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    onSubmit,
  };
};
