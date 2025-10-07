
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OrderFormValues } from "@/types/order";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context";
import { useItemMaster } from "@/hooks/useItemMaster";

export const useUpdateOrder = (orderId: string) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { items } = useItemMaster();

  const onSubmit = async (data: OrderFormValues) => {
    if (!user?.id) {
      toast.error("You must be logged in to update an order");
      return;
    }

    if (!data.warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    setIsSubmitting(true);
    console.log("Updating order with data:", data);
    console.log("Order items being updated:", data.orderItems);
    
    try {
      // Format the date for the API
      const formattedDate = data.requiredDeliveryDate.toISOString().split('T')[0];
      
      // Calculate total items count and value from orderItems array
      const totalItems = data.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = data.orderItems.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0);
      
      // Prepare order items with item details for dimensions
      const orderItemsWithDetails = data.orderItems.map(orderItem => {
        const itemDetails = items.find(item => item.id === orderItem.itemId);
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
      
      // Update the order in the database
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: data.customerName,
          customer_company: data.customerCompany || null,
          customer_email: data.customerEmail || null,
          customer_phone: data.customerPhone || null,
          required_delivery_date: formattedDate,
          items: orderItemsWithDetails, // Store detailed items array
          value: totalValue,
          shipping_address: {
            street1: data.street1,
            street2: data.street2 || undefined,
            city: data.city,
            state: data.state,
            zip: data.zip,
            country: data.country
          },
          warehouse_id: data.warehouseId
        })
        .eq('id', parseInt(orderId)); // Use id field, not order_id
      
      if (error) {
        console.error("Error updating order:", error);
        toast.error("Failed to update order. Please try again.");
        return;
      }
      
      // Get the updated order record for cartonization
      const { data: updatedOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', parseInt(orderId)) // Use id field, not order_id
        .single();

      if (!fetchError && updatedOrder) {
        // Get user's company for cartonization
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (!profileError && userProfile?.company_id && orderItemsWithDetails.length > 0) {
          try {
            console.log("Recalculating cartonization for updated order:", updatedOrder.id);
            
            // Get company boxes for cartonization
            const { data: boxes, error: boxError } = await supabase
              .from('boxes')
              .select('*')
              .eq('company_id', userProfile.company_id)
              .eq('is_active', true)
              .gt('in_stock', 0);

            if (!boxError && boxes && boxes.length > 0) {
              // Import cartonization logic
              const { CartonizationEngine } = await import('../services/cartonization/cartonizationEngine');
              
              // Convert order items to cartonization items
              const items = orderItemsWithDetails
                .filter(item => item.dimensions)
                .map(item => ({
                  id: item.itemId,
                  name: item.name,
                  sku: item.sku,
                  length: item.dimensions!.length,
                  width: item.dimensions!.width,
                  height: item.dimensions!.height,
                  weight: item.dimensions!.weight,
                  quantity: item.quantity,
                  category: 'order_item'
                }));

              if (items.length > 0) {
                const engine = new CartonizationEngine(boxes.map(box => ({
                  id: box.id,
                  name: box.name,
                  sku: box.sku,
                  length: box.length,
                  width: box.width,
                  height: box.height,
                  maxWeight: box.max_weight,
                  cost: box.cost,
                  inStock: box.in_stock,
                  type: box.box_type
                })));

                const result = engine.calculateOptimalBox(items);
                
                if (result && result.recommendedBox) {
                  const itemsWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
                  const boxWeight = result.recommendedBox.cost * 0.1; // Estimate box weight
                  const totalWeight = itemsWeight + boxWeight;

                  // Update cartonization result
                  const { error: cartonError } = await supabase.rpc('update_order_cartonization', {
                    p_order_id: updatedOrder.id,
                    p_recommended_box_id: result.recommendedBox.id,
                    p_recommended_box_data: JSON.parse(JSON.stringify(result.recommendedBox)),
                    p_utilization: result.utilization,
                    p_confidence: result.confidence,
                    p_total_weight: totalWeight,
                    p_items_weight: itemsWeight,
                    p_box_weight: boxWeight
                  });

                  if (cartonError) {
                    console.error("Error updating cartonization data:", cartonError);
                  } else {
                    console.log("Cartonization data updated successfully for order:", updatedOrder.id);
                  }
                } else {
                  // If no suitable box found, remove existing cartonization
                  const { error: deleteError } = await supabase
                    .from('order_cartonization')
                    .delete()
                    .eq('order_id', updatedOrder.id);
                  
                  if (deleteError) {
                    console.error("Error removing cartonization data:", deleteError);
                  }
                }
              }
            }
          } catch (cartonizationError) {
            console.error("Error recalculating cartonization:", cartonizationError);
            // Don't fail order update if cartonization fails
          }
        }
      }
      
      toast.success(`Order ${orderId} updated successfully!`);
      
      // Navigate back to orders page with highlight
      navigate(`/orders?highlight=${orderId}`);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    onSubmit,
  };
};
