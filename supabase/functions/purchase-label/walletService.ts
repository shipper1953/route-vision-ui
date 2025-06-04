
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

  // Get wallet
  const { data: wallet, error: walletError } = await supabaseService
    .from('wallets')
    .select('id, balance')
    .eq('company_id', companyId)
    .single();

  if (walletError || !wallet) {
    throw new Error('Wallet not found');
  }

  // Check sufficient funds
  if (wallet.balance < labelCost) {
    throw new Error(`Insufficient funds. Required: $${labelCost.toFixed(2)}, Available: $${wallet.balance.toFixed(2)}`);
  }

  // Deduct funds
  const newBalance = wallet.balance - labelCost;
  const { error: updateError } = await supabaseService
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', wallet.id);

  if (updateError) {
    throw new Error('Failed to update wallet');
  }

  // Record transaction
  const { error: transactionError } = await supabaseService
    .from('transactions')
    .insert([{
      wallet_id: wallet.id,
      company_id: companyId,
      amount: -labelCost,
      type: 'debit',
      description: 'Shipping label purchase',
      reference_id: purchaseResponseId,
      reference_type: 'shipping_label',
      created_by: userId
    }]);

  if (transactionError) {
    console.error('Failed to record transaction:', transactionError);
    // Don't fail the whole operation for transaction recording failure
  } else {
    console.log('Transaction recorded successfully');
  }

  console.log(`Deducted $${labelCost} from wallet. New balance: $${newBalance}`);
}
