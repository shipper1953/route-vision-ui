
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface WalletActionsProps {
  balance: number;
  onManualAdd: () => void;
  onStripeAdd: () => void;
  companyId?: string;
  onBalanceUpdated?: () => void;
}

export const WalletActions = ({ 
  balance, 
  onManualAdd, 
  onStripeAdd, 
  companyId,
  onBalanceUpdated 
}: WalletActionsProps) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { isSuperAdmin } = useAuth();

  const recalculateBalance = async () => {
    if (!companyId) return;
    
    setIsRecalculating(true);
    try {
      // Get wallet and transactions to recalculate balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('company_id', companyId)
        .single();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('wallet_id', wallet.id);

      if (!transactions) {
        throw new Error('Failed to fetch transactions');
      }

      // Calculate the correct balance
      const correctBalance = transactions.reduce((sum, transaction) => {
        return sum + transaction.amount;
      }, 0);

      // Update the wallet balance
      const { error } = await supabase
        .from('wallets')
        .update({ balance: correctBalance })
        .eq('id', wallet.id);

      if (error) throw error;

      toast.success(`Balance recalculated to $${correctBalance.toFixed(2)}`);
      onBalanceUpdated?.();
    } catch (error) {
      console.error('Error recalculating balance:', error);
      toast.error('Failed to recalculate balance');
    } finally {
      setIsRecalculating(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Wallet Management</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={recalculateBalance}
              disabled={isRecalculating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
              {isRecalculating ? 'Calculating...' : 'Recalculate'}
            </Button>
            {isSuperAdmin && (
              <Button variant="outline" onClick={onManualAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Manual Add
              </Button>
            )}
            <Button onClick={onStripeAdd}>
              <CreditCard className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Add funds to your wallet to pay for shipping labels and services. 
          Use Stripe for secure credit card or bank account payments.
        </p>
        
        <div className="text-lg font-semibold">
          Current Balance: ${balance.toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
};
