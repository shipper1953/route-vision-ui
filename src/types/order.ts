
import * as z from "zod";

// Define the form schema using zod
export const orderFormSchema = z.object({
  customerName: z.string().min(1, { message: "Customer name is required" }),
  customerCompany: z.string().optional(),
  customerEmail: z.string().email({ message: "Invalid email address" }).optional(),
  customerPhone: z.string().optional(),
  requiredDeliveryDate: z.date({
    required_error: "Required delivery date is required",
  }),
  items: z.number().min(1, { message: "Items must be at least 1" }),
  value: z.string().min(1, { message: "Value is required" }),
  street1: z.string().min(1, { message: "Street address is required" }),
  street2: z.string().optional(),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(2, { message: "State is required" }),
  zip: z.string().min(5, { message: "Zip code is required" }),
  country: z.string().min(2, { message: "Country is required" }).default("US"),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
