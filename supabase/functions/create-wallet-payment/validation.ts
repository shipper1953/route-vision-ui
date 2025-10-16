import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Wallet payment request validation
export const WalletPaymentSchema = z.object({
  amount: z.number()
    .int('Amount must be an integer (cents)')
    .positive('Amount must be positive')
    .max(1000000, 'Maximum payment is $10,000 (1,000,000 cents)')
    .refine(val => Number.isFinite(val), 'Amount must be a valid number'),
  companyId: z.string()
    .uuid('Invalid company ID format')
    .min(1, 'Company ID is required'),
  savePaymentMethod: z.boolean()
    .optional()
    .default(false)
});

export type WalletPaymentRequest = z.infer<typeof WalletPaymentSchema>;
