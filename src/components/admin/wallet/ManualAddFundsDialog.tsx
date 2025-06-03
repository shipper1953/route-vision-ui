
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const addFunds = async () => {
    try {
      const amount = parseFloat(addFundsAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Add transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          wallet_id: wallet?.id,
          company_id: companyId,
          amount,
          type: 'credit',
          description: 'Manual funds addition',
          reference_type: 'manual_credit'
        }]);

      if (transactionError) throw transactionError;

      // Update wallet balance
      const newBalance = (wallet?.balance || 0) + amount;
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet?.id);

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
