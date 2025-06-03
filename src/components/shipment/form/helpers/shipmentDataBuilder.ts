
import { ShipmentForm } from "@/types/shipment";
import { useAuth } from "@/context";

export function buildShipmentData(data: ShipmentForm) {
  // Include order ID in the shipment reference if available
  const orderReference = data.orderId || data.orderBarcode || null;
  console.log("Using order reference for shipment:", orderReference);
  
  return {
    from_address: {
      name: data.fromName,
      company: data.fromCompany,
      street1: data.fromStreet1,
      street2: data.fromStreet2,
      city: data.fromCity,
      state: data.fromState,
      zip: data.fromZip,
      country: data.fromCountry,
      phone: data.fromPhone,
      email: data.fromEmail
    },
    to_address: {
      name: data.toName,
      company: data.toCompany,
      street1: data.toStreet1,
      street2: data.toStreet2,
      city: data.toCity,
      state: data.toState,
      zip: data.toZip,
      country: data.toCountry,
      phone: data.toPhone,
      email: data.toEmail
    },
    parcel: {
      length: data.length,
      width: data.width,
      height: data.height,
      weight: data.weight
    },
    options: {
      smartrate_accuracy: 'percentile_95'
    },
    // Include order reference for linking
    reference: orderReference
  };
}
