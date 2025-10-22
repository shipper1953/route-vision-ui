
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

export async function processWalletPayment(companyId: string, labelCost: number, userId: string, purchaseResponseId: string) {
  if (labelCost <= 0) {
    console.log('No payment processing needed - cost is zero');
    return;
  }

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // Use atomic wallet deduction function to prevent race conditions
  const { data, error } = await supabaseService.rpc('deduct_from_wallet', {
    p_wallet_id: null, // Will find by company_id
    p_company_id: companyId,
    p_amount: labelCost,
    p_user_id: userId,
    p_reference_id: purchaseResponseId,
    p_description: 'Shipping label purchase'
  });

  if (error) {
    console.error('Wallet deduction error:', error);
    throw new Error(`Failed to process wallet payment: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Wallet deduction failed - no response');
  }

  const result = data[0];
  
  if (!result.success) {
    console.error('Wallet deduction failed:', result.message);
    throw new Error(result.message);
  }

  console.log(`✅ Deducted $${labelCost.toFixed(2)} from wallet. New balance: $${result.new_balance.toFixed(2)}`);
}
