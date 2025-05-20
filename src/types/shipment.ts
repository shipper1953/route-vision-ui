
import { z } from "zod";

export const shipmentSchema = z.object({
  // Barcode field for order lookup
  orderBarcode: z.string().optional(),
  
  // From address fields
  fromName: z.string().min(1, "Name is required"),
  fromCompany: z.string().optional(),
  fromStreet1: z.string().min(1, "Street address is required"),
  fromStreet2: z.string().optional(),
  fromCity: z.string().min(1, "City is required"),
  fromState: z.string().min(1, "State is required"),
  fromZip: z.string().min(1, "Zip code is required"),
  fromCountry: z.string().min(1, "Country is required"),
  fromPhone: z.string().optional(),
  fromEmail: z.string().email("Invalid email address").optional(),
  
  // To address fields
  toName: z.string().min(1, "Name is required"),
  toCompany: z.string().optional(),
  toStreet1: z.string().min(1, "Street address is required"),
  toStreet2: z.string().optional(),
  toCity: z.string().min(1, "City is required"),
  toState: z.string().min(1, "State is required"),
  toZip: z.string().min(1, "Zip code is required"),
  toCountry: z.string().min(1, "Country is required"),
  toPhone: z.string().optional(),
  toEmail: z.string().email("Invalid email address").optional(),
  
  // Parcel fields
  length: z.coerce.number().min(0.1, "Length must be greater than 0"),
  width: z.coerce.number().min(0.1, "Width must be greater than 0"),
  height: z.coerce.number().min(0.1, "Height must be greater than 0"),
  weight: z.coerce.number().min(0.1, "Weight must be greater than 0"),

  // Order details
  orderId: z.string().optional(),
  requiredDeliveryDate: z.string().optional(),
});

export type ShipmentForm = z.infer<typeof shipmentSchema>;
