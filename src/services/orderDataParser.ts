
// Order data parsing utilities

import { OrderData, OrderItem } from "@/types/orderTypes";

export const parseOrderItems = (rawItems: any): OrderItem[] => {
  if (import.meta.env.DEV) {
    console.log("Parsing order items:", rawItems);
  }
  
  if (!rawItems) {
    if (import.meta.env.DEV) {
      console.log("No raw items provided");
    }
    return [];
  }

  // Handle if items is already an array
  if (Array.isArray(rawItems)) {
    if (import.meta.env.DEV) {
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
      if (import.meta.env.DEV) {
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
    if (import.meta.env.DEV) {
      console.log("Items is just a count:", rawItems);
    }
    // Create placeholder items
    return Array.from({ length: rawItems }, (_, index) => ({
      itemId: `placeholder-${index}`,
      quantity: 1,
      name: `Item ${index + 1}`
    }));
  }

  if (import.meta.env.DEV) {
    console.log("Unknown items format:", typeof rawItems, rawItems);
  }
  return [];
};

export const parseParcelInfo = (qboidData: any) => {
  if (!qboidData) {
    if (import.meta.env.DEV) {
      console.warn("No Qboid dimensions found for order");
    }
    return null;
  }

  try {
    const parsed = typeof qboidData === 'string' ? JSON.parse(qboidData) : qboidData;
    if (import.meta.env.DEV) {
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

  if (import.meta.env.DEV) {
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
    street1: addressData.street1 || "",
    street2: addressData.street2 || "",
    city: addressData.city || "",
    state: addressData.state || "",
    zip: addressData.zip || "",
    country: addressData.country || "US"
  };
};

export const convertSupabaseToOrderData = (supabaseOrder: any): OrderData => {
  if (import.meta.env.DEV) {
    console.log("Converting Supabase order to OrderData:", supabaseOrder);
  }
  
  const parsedItems = parseOrderItems(supabaseOrder.items);
  if (import.meta.env.DEV) {
    console.log("Parsed items for order:", supabaseOrder.id, parsedItems);
  }

  return {
    id: String(supabaseOrder.id), // Always convert to string for consistency
    orderId: supabaseOrder.order_id || "", // Shopify order number
    customerName: supabaseOrder.customer_name || "",
    customerCompany: supabaseOrder.customer_company || "",
    customerPhone: supabaseOrder.customer_phone || "",
    customerEmail: supabaseOrder.customer_email || "",
    orderDate: supabaseOrder.order_date || new Date().toISOString(),
    requiredDeliveryDate: supabaseOrder.required_delivery_date || "",
    status: supabaseOrder.status || "pending",
    items: parsedItems,
    value: supabaseOrder.value || "0.00",
    shippingAddress: parseShippingAddress(supabaseOrder.shipping_address),
    parcelInfo: parseParcelInfo(supabaseOrder.qboid_dimensions),
    shipment: supabaseOrder.shipment_data ? {
      ...supabaseOrder.shipment_data,
      estimatedDeliveryDate: supabaseOrder.estimated_delivery_date,
      actualDeliveryDate: supabaseOrder.actual_delivery_date
    } : null // Map shipment_data to shipment field with delivery dates from order
  };
};
