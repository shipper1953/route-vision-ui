
import { supabase } from "@/integrations/supabase/client";
import { OrderData } from "@/types/orderTypes";

interface OrderItemWithDetails {
  itemId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  sku: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
}

interface CreateOrderInput extends Omit<OrderData, 'id'> {
  warehouseId?: string;
  orderItems?: OrderItemWithDetails[];
}

export const createOrder = async (orderData: CreateOrderInput): Promise<OrderData> => {
  console.log("Creating order with data:", orderData);
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User must be authenticated to create orders");
  }

  // Fetch user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('company_id, warehouse_ids')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile?.company_id) {
    throw new Error("User profile not found or not assigned to a company");
  }

  // Determine warehouse ID (use provided, user's first, or company default in parallel)
  let finalWarehouseId: string | null = orderData.warehouseId || null;
  
  if (!finalWarehouseId) {
    const warehouseIds = Array.isArray(userProfile.warehouse_ids) ? userProfile.warehouse_ids : [];
    finalWarehouseId = warehouseIds.length > 0 ? String(warehouseIds[0]) : null;
  }

  // Parallelize warehouse lookup and order ID generation
  const [warehouseResult, orderIdResult] = await Promise.all([
    // Fetch default warehouse only if needed
    !finalWarehouseId
      ? supabase
          .from('warehouses')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .eq('is_default', true)
          .maybeSingle()
      : Promise.resolve({ data: { id: finalWarehouseId }, error: null }),
    // Generate unique order ID in parallel
    (async () => {
      let orderId: string;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle();
        
        if (!existingOrder) return orderId;
        attempts++;
      }
      throw new Error("Failed to generate unique order ID after multiple attempts");
    })()
  ]);

  if (!warehouseResult.error && warehouseResult.data) {
    finalWarehouseId = warehouseResult.data.id;
  }

  if (!finalWarehouseId) {
    throw new Error("No warehouse available for this user or company. Please contact your administrator to set up a warehouse.");
  }

  const orderId = orderIdResult;
  // Prepare items data - include both legacy format and detailed items
  const itemsData = orderData.orderItems && orderData.orderItems.length > 0 
    ? orderData.orderItems.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        name: item.name,
        sku: item.sku,
        dimensions: item.dimensions
      }))
    : [{ count: orderData.items, description: "Items" }];

  // Use any type to bypass TypeScript issues with generated types
  const orderRecord: any = {
    order_id: orderId,
    customer_name: orderData.customerName,
    customer_company: orderData.customerCompany || null,
    customer_email: orderData.customerEmail || null,
    customer_phone: orderData.customerPhone || null,
    order_date: orderData.orderDate,
    required_delivery_date: orderData.requiredDeliveryDate,
    status: orderData.status,
    items: itemsData,
    value: parseFloat(orderData.value) || 0,
    shipping_address: orderData.shippingAddress,
    user_id: user.id,
    company_id: userProfile.company_id,
    warehouse_id: finalWarehouseId
  };

  console.log("Creating order with warehouse_id:", finalWarehouseId);

  const { data, error } = await supabase
    .from('orders')
    .insert(orderRecord)
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    throw new Error(`Failed to create order: ${error.message}`);
  }

  console.log("Order created successfully with warehouse:", data.warehouse_id);

  // Calculate and store cartonization data for the new order (only if items have dimensions)
  if (orderData.orderItems && orderData.orderItems.length > 0 && 
      orderData.orderItems.some(item => item.dimensions)) {
    try {
      // Fetch boxes only for cartonization (narrower projection for performance)
      const { data: boxes, error: boxError } = await supabase
        .from('boxes')
        .select('id, name, sku, length, width, height, max_weight, cost, in_stock, min_stock, max_stock, box_type')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .gt('in_stock', 0);

      if (!boxError && boxes && boxes.length > 0) {
        // Import cartonization logic
        const { CartonizationEngine } = await import('../services/cartonization/cartonizationEngine');
        
        // Convert order items to cartonization items
        const items = orderData.orderItems
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
            category: 'order_item' as const
          }));

        if (items.length > 0) {
          const engine = new CartonizationEngine(boxes.map(box => ({
            id: box.id,
            name: box.name,
            sku: box.sku,
            length: Number(box.length),
            width: Number(box.width),
            height: Number(box.height),
            maxWeight: Number(box.max_weight),
            cost: Number(box.cost),
            inStock: box.in_stock,
            minStock: box.min_stock,
            maxStock: box.max_stock,
            type: box.box_type as 'box' | 'poly_bag' | 'envelope' | 'tube' | 'custom'
          })));

          console.log("Running cartonization engine...");
          
          // Try single-package first, then multi-package if needed
          let result = engine.calculateOptimalBox(items, false);
          let multiPackageResult = null;
          
          // If single package fails or has low confidence, try multi-package
          if (!result || result.confidence < 60) {
            console.log('Single-package solution insufficient, trying multi-package...');
            multiPackageResult = engine.calculateMultiPackageCartonization(items, 'balanced');
            
            if (multiPackageResult) {
              console.log(`Multi-package solution found: ${multiPackageResult.totalPackages} packages`);
              // Create a result from multi-package for storage
              result = {
                recommendedBox: multiPackageResult.packages[0].box,
                utilization: multiPackageResult.packages[0].utilization,
                itemsFit: true,
                totalWeight: multiPackageResult.totalWeight,
                totalVolume: multiPackageResult.totalVolume,
                dimensionalWeight: multiPackageResult.packages[0].dimensionalWeight,
                savings: 0,
                confidence: multiPackageResult.confidence,
                alternatives: multiPackageResult.packages.slice(1, 4).map(pkg => ({
                  box: pkg.box,
                  utilization: pkg.utilization,
                  cost: pkg.box.cost,
                  confidence: pkg.confidence
                })),
                rulesApplied: multiPackageResult.rulesApplied,
                processingTime: multiPackageResult.processingTime,
                multiPackageResult: multiPackageResult
              };
            }
          }
          
          console.log("Cartonization result:", result);
          
          if (result && result.recommendedBox) {
            const itemsWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
            const boxWeight = result.recommendedBox.cost * 0.1; // Estimate box weight
            const totalWeight = itemsWeight + boxWeight;

            if (import.meta.env.DEV) {
              console.log("Storing cartonization data:", {
                orderId: data.id,
                boxId: result.recommendedBox.id,
                utilization: result.utilization,
                confidence: result.confidence,
                totalWeight,
                multiPackage: !!multiPackageResult
              });
            }

            // Store cartonization result with direct INSERT/UPDATE (better error visibility than RPC)
            const cartonizationRecord = {
              order_id: data.id,
              recommended_box_id: result.recommendedBox.id,
              recommended_box_data: {
                ...result.recommendedBox,
                multiPackageResult: multiPackageResult || null
              },
              utilization: Number(result.utilization),
              confidence: Number(result.confidence),
              total_weight: Number(totalWeight),
              items_weight: Number(itemsWeight),
              box_weight: Number(boxWeight),
              calculation_timestamp: new Date().toISOString(),
              packages: multiPackageResult?.packages || [],
              total_packages: multiPackageResult?.totalPackages || 1,
              splitting_strategy: multiPackageResult?.splittingStrategy || null,
              optimization_objective: multiPackageResult?.optimizationObjective || 'balanced'
            };

            const { error: cartonError } = await supabase
              .from('order_cartonization')
              .upsert(cartonizationRecord, {
                onConflict: 'order_id'
              });

            if (cartonError) {
              console.error("Error storing cartonization data:", cartonError);
              console.error("Cartonization record that failed:", cartonizationRecord);
            } else {
              if (import.meta.env.DEV) {
                console.log("Cartonization data stored successfully for order:", data.id);
                if (multiPackageResult) {
                  console.log(`Multi-package data stored: ${multiPackageResult.totalPackages} packages`);
                }
              }
            }
          } else {
            console.log("No cartonization result returned from engine");
          }
        } else {
          console.log("No items with dimensions found for cartonization");
        }
      } else {
        console.log("No boxes available for cartonization:", { boxError, boxCount: boxes?.length });
      }
    } catch (cartonizationError) {
      console.error("Error calculating cartonization:", cartonizationError);
      // Don't fail order creation if cartonization fails
    }
  } else {
    console.log("No order items provided for cartonization");
  }

  // Convert back to OrderData format with proper type handling
  const shippingAddress = typeof data.shipping_address === 'object' && data.shipping_address !== null
    ? data.shipping_address as any
    : {
        street1: '',
        city: '',
        state: '',
        zip: '',
        country: 'US'
      };

  return {
    id: data.id.toString(),
    customerName: data.customer_name || '',
    customerCompany: data.customer_company || undefined,
    customerEmail: data.customer_email || undefined,
    customerPhone: data.customer_phone || undefined,
    orderDate: data.order_date || '',
    requiredDeliveryDate: data.required_delivery_date || '',
    status: data.status || 'ready_to_ship',
    items: Array.isArray(data.items) ? data.items.length : 1,
    value: data.value?.toString() || '0',
    shippingAddress: shippingAddress
  };
};
