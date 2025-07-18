
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet } from "@/types/auth";

interface ManualAddFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: Wallet | null;
  companyId?: string;
  onSuccess: () => void;
}

export const ManualAddFundsDialog = ({ 
  open, 
  onOpenChange, 
  wallet, 
  companyId, 
  onSuccess 
}: ManualAddFundsDialogProps) => {
  const [addFundsAmount, setAddFundsAmount] = useState('');

  const ensureWalletExists = async () => {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Check if wallet exists
    const { data: existingWallet, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingWallet) {
      return existingWallet;
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create wallet if it doesn't exist
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert([{
        company_id: companyId,
        user_id: user.id,
        balance: 0,
        currency: 'USD'
      }])
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return newWallet;
  };

  const addFunds = async () => {
    try {
      const amount = parseFloat(addFundsAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Ensure wallet exists
      const currentWallet = await ensureWalletExists();

      // Add transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          wallet_id: currentWallet.id,
          company_id: companyId,
          amount,
          type: 'credit',
          description: 'Manual funds addition',
          reference_type: 'manual_credit'
        }]);

      if (transactionError) throw transactionError;

      // Calculate the correct balance from all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('wallet_id', currentWallet.id);

      const correctBalance = (transactions || []).reduce((sum, transaction) => sum + transaction.amount, 0);
      
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: correctBalance })
        .eq('id', currentWallet.id);

      if (walletError) throw walletError;

      setAddFundsAmount('');
      onOpenChange(false);
      onSuccess();
      toast.success('Funds added successfully');
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error('Failed to add funds');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Funds Manually</DialogTitle>
          <DialogDescription>
            Manually add funds to the company wallet. This will create a credit transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={addFundsAmount}
              onChange={(e) => setAddFundsAmount(e.target.value)}
              placeholder="Enter amount to add"
            />
          </div>
          <Button onClick={addFunds} className="w-full">
            Add Funds
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
