import * as z from "zod";

// Define schemas for address and parcel
const addressSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  street1: z.string().min(1, { message: "Street address is required" }),
  street2: z.string().optional(),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(2, { message: "State is required" }),
  zip: z.string().min(5, { message: "Zip code is required" }),
  country: z.string().min(2, { message: "Country is required" }),
  phone: z.string().optional(),
  email: z.string().optional(),
});

const parcelSchema = z.object({
  length: z.number().gt(0, { message: "Length must be greater than 0" }),
  width: z.number().gt(0, { message: "Width must be greater than 0" }),
  height: z.number().gt(0, { message: "Height must be greater than 0" }),
  weight: z.number().gt(0, { message: "Weight must be greater than 0" }),
});

// Define the main shipment schema
export const shipmentSchema = z.object({
  // From address fields
  fromName: z.string().optional(),
  fromCompany: z.string().optional(),
  fromStreet1: z.string().min(1, { message: "Street address is required" }),
  fromStreet2: z.string().optional(),
  fromCity: z.string().min(1, { message: "City is required" }),
  fromState: z.string().min(2, { message: "State is required" }),
  fromZip: z.string().min(5, { message: "Zip code is required" }),
  fromCountry: z.string().min(2, { message: "Country is required" }),
  fromPhone: z.string().optional(),
  fromEmail: z.string().optional(),
  
  // To address fields
  toName: z.string().min(1, { message: "Name is required" }),
  toCompany: z.string().optional(),
  toStreet1: z.string().min(1, { message: "Street address is required" }),
  toStreet2: z.string().optional(),
  toCity: z.string().min(1, { message: "City is required" }),
  toState: z.string().min(2, { message: "State is required" }),
  toZip: z.string().min(5, { message: "Zip code is required" }),
  toCountry: z.string().min(2, { message: "Country is required" }),
  toPhone: z.string().optional(),
  toEmail: z.string().optional(),
  
  // Package dimensions
  length: z.number().gt(0, { message: "Length must be greater than 0" }),
  width: z.number().gt(0, { message: "Width must be greater than 0" }),
  height: z.number().gt(0, { message: "Height must be greater than 0" }),
  weight: z.number().gt(0, { message: "Weight must be greater than 0" }),
  
  // Order details
  orderBarcode: z.string().optional(),
  orderId: z.string().optional(),
  
  // Shipping options
  requiredDeliveryDate: z.string().optional(),
  
  // EasyPost shipment ID
  shipmentId: z.string().optional(),
});

export type ShipmentForm = z.infer<typeof shipmentSchema>;
