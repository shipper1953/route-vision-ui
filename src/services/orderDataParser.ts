
// Order data parsing utilities

import { OrderData, OrderItem } from "@/types/orderTypes";

const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_ORDER_PARSER === 'true' || import.meta.env.DEV;

export const parseOrderItems = (rawItems: any): OrderItem[] => {
  if (DEBUG_ENABLED) {
    console.log("Parsing order items:", rawItems);
  }
  
  if (!rawItems) {
    if (DEBUG_ENABLED) {
      console.log("No raw items provided");
    }
    return [];
  }

  // Handle if items is already an array
  if (Array.isArray(rawItems)) {
    if (DEBUG_ENABLED) {
      console.log("Items is already an array:", rawItems);
    }
    return rawItems.map((item: any) => ({
      itemId: item.itemId || item.id || `item-${Math.random()}`,
      quantity: item.quantity || item.count || 1,
      unitPrice: item.unitPrice || item.price,
      name: item.name || item.description,
      sku: item.sku,
      // Handle both nested dimensions object and flat dimensions
      dimensions: item.dimensions || (
        item.length && item.width && item.height && item.weight
          ? {
              length: Number(item.length),
              width: Number(item.width),
              height: Number(item.height),
              weight: Number(item.weight)
            }
          : undefined
      )
    }));
  }

  // Handle if items is a string (JSON)
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      if (DEBUG_ENABLED) {
        console.log("Parsed items from JSON:", parsed);
      }
      return parseOrderItems(parsed);
    } catch (error) {
      console.error("Error parsing items JSON:", error);
      return [];
    }
  }

  // Handle if items is a number (count only)
  if (typeof rawItems === 'number') {
    if (DEBUG_ENABLED) {
      console.log("Items is just a count:", rawItems);
    }
    // Create placeholder items
    return Array.from({ length: rawItems }, (_, index) => ({
      itemId: `placeholder-${index}`,
      quantity: 1,
      name: `Item ${index + 1}`
    }));
  }

  if (DEBUG_ENABLED) {
    console.log("Unknown items format:", typeof rawItems, rawItems);
  }
  return [];
};

export const parseParcelInfo = (qboidData: any) => {
  if (!qboidData) {
    if (DEBUG_ENABLED) {
      console.warn("No Qboid dimensions found for order");
    }
    return null;
  }

  try {
    const parsed = typeof qboidData === 'string' ? JSON.parse(qboidData) : qboidData;
    if (DEBUG_ENABLED) {
      console.log("Qboid dimensions found for order:", parsed.orderId, parsed);
    }
    return {
      length: parsed.length || 0,
      width: parsed.width || 0,
      height: parsed.height || 0,
      weight: parsed.weight || 0
    };
  } catch (error) {
    console.error("Error parsing parcel info:", error);
    return null;
  }
};

export const parseShippingAddress = (addressData: any) => {
  // Check if addressData is a string that needs parsing
  if (typeof addressData === 'string') {
    try {
      addressData = JSON.parse(addressData);
    } catch (error) {
      console.error("Error parsing address JSON:", error);
      return {
        street1: "",
        street2: "",
        city: "",
        state: "",
        zip: "",
        country: "US"
      };
    }
  }

  // Now check if it's a valid object with required fields
  if (!addressData || typeof addressData !== 'object') {
    console.warn("Invalid address data - not an object:", addressData);
    return {
      street1: "",
      street2: "",
      city: "",
      state: "",
      zip: "",
      country: "US"
    };
  }

  if (DEBUG_ENABLED) {
    console.log("Parsed shipping address:", {
      street1: addressData.street1 || "",
      street2: addressData.street2 || "",
      city: addressData.city || "",
      state: addressData.state || "",
      zip: addressData.zip || "",
      country: addressData.country || "US"
    });
  }

  return {
    street1: addressData.street1 || addressData.address1 || "",
    street2: addressData.street2 || addressData.address2 || "",
    city: addressData.city || "",
    state: addressData.state || "",
    zip: addressData.zip || "",
    country: addressData.country || "US"
  };
};

export const convertSupabaseToOrderData = (supabaseOrder: any): OrderData => {
  if (DEBUG_ENABLED) {
    console.log("Converting Supabase order to OrderData:", supabaseOrder);
  }
  
  const parsedItems = parseOrderItems(supabaseOrder.items);
  if (DEBUG_ENABLED) {
    console.log("Parsed items for order:", supabaseOrder.id, parsedItems);
  }

  const normalizedStatus = (() => {
    const rawStatus = supabaseOrder.status || "ready_to_ship";
    if (rawStatus === 'processing' || rawStatus === 'pending') return 'ready_to_ship';
    if (rawStatus === 'partially_fulfilled') return 'partially_shipped';
    return rawStatus;
  })();

  return {
    id: String(supabaseOrder.id), // Always convert to string for consistency
    orderId: supabaseOrder.order_id || "", // Shopify order number
    shopifyOrderId: supabaseOrder.shopify_order_id || undefined,
    shopifyOrderNumber: supabaseOrder.shopify_order_number || supabaseOrder.order_id || "",
    shopifyOrderUrl: supabaseOrder.shopify_store_url && supabaseOrder.shopify_order_id
      ? `https://${supabaseOrder.shopify_store_url}/admin/orders/${supabaseOrder.shopify_order_id}`
      : undefined,
    customerName: supabaseOrder.customer_name || "",
    customerCompany: supabaseOrder.customer_company || "",
    customerPhone: supabaseOrder.customer_phone || "",
    customerEmail: supabaseOrder.customer_email || "",
    orderDate: supabaseOrder.order_date || new Date().toISOString(),
    requiredDeliveryDate: supabaseOrder.required_delivery_date || "",
    status: normalizedStatus,
    items: parsedItems,
    value: supabaseOrder.value || "0.00",
    shippingAddress: parseShippingAddress(supabaseOrder.shipping_address),
    parcelInfo: parseParcelInfo(supabaseOrder.qboid_dimensions),
    shipment: supabaseOrder.shipment_data ? {
      ...supabaseOrder.shipment_data,
      estimatedDeliveryDate: supabaseOrder.estimated_delivery_date,
      actualDeliveryDate: supabaseOrder.actual_delivery_date
    } : null, // Map shipment_data to shipment field with delivery dates from order
    warehouseId: supabaseOrder.warehouse_id || undefined,
    companyId: supabaseOrder.company_id || undefined,
    estimatedDeliveryDate: supabaseOrder.estimated_delivery_date || undefined,
    actualDeliveryDate: supabaseOrder.actual_delivery_date || undefined,
    items_total: supabaseOrder.items_total ?? undefined,
    items_shipped: supabaseOrder.items_shipped ?? undefined,
    fulfillment_percentage: supabaseOrder.fulfillment_percentage ?? undefined,
    fulfillment_status: supabaseOrder.fulfillment_status ?? undefined,
  } as any;
};
