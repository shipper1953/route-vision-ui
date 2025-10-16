import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Schema for purchase label request
export const PurchaseLabelSchema = z.object({
  shipmentId: z.string().min(1, 'Shipment ID required').max(100),
  rateId: z.string().min(1, 'Rate ID required').max(100),
  companyId: z.string().uuid('Invalid company ID format').optional(),
  orderId: z.number().int().positive().optional(),
  packageIndex: z.number().int().min(0).optional(),
  selectedItems: z.array(
    z.object({
      sku: z.string().max(100),
      name: z.string().max(255),
      quantity: z.number().int().positive().max(10000),
      weight: z.number().positive().optional(),
      dimensions: z.object({
        length: z.number().positive(),
        width: z.number().positive(),
        height: z.number().positive()
      }).optional()
    })
  ).optional()
});

// Schema for wallet payment validation
export const WalletPaymentSchema = z.object({
  companyId: z.string().uuid('Invalid company ID'),
  labelCost: z.number()
    .positive('Label cost must be positive')
    .max(10000, 'Label cost exceeds maximum ($10,000)')
    .refine(val => Number.isFinite(val), 'Label cost must be a valid number'),
  userId: z.string().uuid('Invalid user ID'),
  purchaseResponseId: z.string().min(1).max(255)
});

// Sanitize string inputs
export function sanitizeString(str: string | null | undefined, maxLength: number = 255): string | null {
  if (!str) return null;
  return str.trim().slice(0, maxLength);
}

// Sanitize phone number
export function sanitizePhoneNumber(phone: string | undefined): string {
  if (!phone) return '5555555555';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 10) {
    return cleaned.padEnd(10, '5');
  }
  
  return cleaned;
}

export type PurchaseLabelRequest = z.infer<typeof PurchaseLabelSchema>;
export type WalletPaymentRequest = z.infer<typeof WalletPaymentSchema>;
