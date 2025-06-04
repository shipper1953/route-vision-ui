
import { z } from "zod";

export const orderFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerCompany: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  requiredDeliveryDate: z.date({
    required_error: "Required delivery date is required",
  }),
  items: z.number().min(1, "At least 1 item is required"),
  value: z.string().min(1, "Order value is required"),
  street1: z.string().min(1, "Address line 1 is required"),
  street2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "Zip code is required"),
  country: z.string().min(1, "Country is required"),
  warehouseId: z.string().min(1, "Warehouse selection is required"),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
