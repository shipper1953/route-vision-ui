
import { ShipmentForm } from "@/types/shipment";

export function buildShipmentData(data: ShipmentForm) {
  // Include order ID in the shipment reference if available
  const orderReference = data.orderId || data.orderBarcode || null;
  console.log("Using order reference for shipment:", orderReference);
  console.log("Building shipment with warehouse from address:", {
    name: data.fromName,
    company: data.fromCompany,
    street1: data.fromStreet1,
    city: data.fromCity,
    state: data.fromState,
    zip: data.fromZip
  });
  
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
      phone: data.fromPhone || "5555555555", // Default phone if missing
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
      phone: data.toPhone || "5555555555", // Default phone if missing  
      email: data.toEmail
    },
    parcel: {
      length: data.length,
      width: data.width,
      height: data.height,
      weight: data.weight
    },
    options: {
      // Use high accuracy SmartRate for best delivery date predictions
      smartrate_accuracy: 'percentile_90',
      currency: 'USD',
      delivery_confirmation: 'NO_SIGNATURE',
      // Add additional options that can help with SmartRate availability
      label_format: 'PDF',
      label_size: '4x6'
    },
    // Include order reference for linking
    reference: orderReference,
    // Include selected box information
    selectedBox: {
      boxId: data.selectedBoxId,
      boxSku: data.selectedBoxSku,
      boxName: data.selectedBoxName,
      selectedBoxes: data.selectedBoxes
    }
  };
}
