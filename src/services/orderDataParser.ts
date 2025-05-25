
import { OrderData } from "@/types/orderTypes";

/**
 * Parses shipment tracking data from various formats
 */
export function parseShipmentInfo(trackingData: any): any {
  if (!trackingData) return undefined;
  
  try {
    if (typeof trackingData === 'string') {
      return JSON.parse(trackingData);
    } else if (typeof trackingData === 'object' && trackingData !== null) {
      return trackingData;
    }
  } catch (e) {
    console.warn("Failed to parse tracking data:", e);
  }
  return undefined;
}

/**
 * Parses shipping address from JSON with error handling
 */
export function parseShippingAddress(addressData: any): any {
  if (!addressData) {
    console.warn("No shipping address found in order data");
    return {};
  }
  
  try {
    if (typeof addressData === 'string') {
      const parsed = JSON.parse(addressData);
      if (parsed && typeof parsed === 'object') {
        console.log("Parsed shipping address:", parsed);
        return parsed;
      }
    } else if (typeof addressData === 'object' && addressData !== null) {
      console.log("Using shipping address object:", addressData);
      return addressData;
    }
  } catch (e) {
    console.warn("Failed to parse shipping address:", e);
  }
  
  return {};
}

/**
 * Parses Qboid dimensions if available
 */
export function parseParcelInfo(dimensionsData: any, orderId: string): any {
  if (!dimensionsData) {
    console.warn("No Qboid dimensions found for order:", orderId);
    return undefined;
  }
  
  try {
    if (typeof dimensionsData === 'string') {
      const parsed = JSON.parse(dimensionsData);
      if (parsed && typeof parsed === 'object') {
        console.log("Qboid dimensions found for order:", orderId, parsed);
        return parsed;
      }
    } else if (typeof dimensionsData === 'object' && dimensionsData !== null) {
      console.log("Qboid dimensions found for order:", orderId, dimensionsData);
      return dimensionsData;
    }
  } catch (e) {
    console.warn("Failed to parse Qboid dimensions:", e);
  }
  
  return undefined;
}

/**
 * Converts Supabase data format to OrderData format
 */
export function convertSupabaseToOrderData(data: any): OrderData {
  const shippingAddress = parseShippingAddress(data.shipping_address);
  const parcelInfo = parseParcelInfo(data.qboid_dimensions, data.order_id);
  const shipmentInfo = parseShipmentInfo((data as any).tracking);
  
  return {
    id: data.order_id,
    customerName: data.customer_name || "Unknown Customer",
    customerCompany: data.customer_company || "",
    customerEmail: data.customer_email || "",
    customerPhone: data.customer_phone || "",
    orderDate: data.order_date || new Date().toISOString().split('T')[0],
    requiredDeliveryDate: data.required_delivery_date || new Date().toISOString().split('T')[0],
    status: data.status || "processing",
    items: typeof data.items === 'number' ? data.items : 1,
    value: data.value?.toString() || "0",
    shippingAddress: shippingAddress as any,
    parcelInfo: parcelInfo,
    shipment: shipmentInfo || ((data as any).tracking_number ? {
      id: `SHIP-${data.id}`,
      carrier: "Unknown",
      service: "Standard",
      trackingNumber: (data as any).tracking_number,
      trackingUrl: `https://www.trackingmore.com/track/en/${(data as any).tracking_number}`
    } : undefined)
  };
}
