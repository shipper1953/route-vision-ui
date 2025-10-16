import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Address schema
const AddressSchema = z.object({
  name: z.string().max(100),
  company: z.string().max(100).optional(),
  street1: z.string().min(1).max(255),
  street2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(2),
  zip: z.string().min(5).max(10),
  country: z.string().length(2).default('US'),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional()
});

// Parcel schema
const ParcelSchema = z.object({
  length: z.number().positive().max(999),
  width: z.number().positive().max(999),
  height: z.number().positive().max(999),
  weight: z.number().positive().max(9999)
});

// Complete shipment data schema
export const ShipmentDataSchema = z.object({
  to_address: AddressSchema,
  from_address: AddressSchema,
  parcel: ParcelSchema,
  options: z.object({
    currency: z.string().length(3).optional(),
    delivery_confirmation: z.string().optional()
  }).optional()
});

// Sanitize address fields
export function sanitizeAddress(address: any): any {
  return {
    ...address,
    name: sanitizeString(address.name, 100),
    company: sanitizeString(address.company, 100),
    street1: sanitizeString(address.street1, 255),
    street2: sanitizeString(address.street2, 255),
    city: sanitizeString(address.city, 100),
    state: sanitizeString(address.state, 2),
    zip: sanitizeString(address.zip, 10),
    phone: sanitizeString(address.phone, 20),
    email: sanitizeString(address.email, 255)
  };
}

export function sanitizeString(str: string | null | undefined, maxLength: number): string | null | undefined {
  if (!str) return str;
  return str.trim().slice(0, maxLength);
}

export type ShipmentData = z.infer<typeof ShipmentDataSchema>;
