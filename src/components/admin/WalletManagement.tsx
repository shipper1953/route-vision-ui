
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Transaction } from "@/types/auth";
import { StripePaymentDialog } from "./StripePaymentDialog";
import { WalletBalanceCards } from "./wallet/WalletBalanceCards";
import { WalletActions } from "./wallet/WalletActions";
import { TransactionsTable } from "./wallet/TransactionsTable";
import { ManualAddFundsDialog } from "./wallet/ManualAddFundsDialog";

interface WalletManagementProps {
  companyId?: string;
}

interface DatabaseTransaction {
  id: string;
  wallet_id: string;
  company_id: string;
  amount: number;
  type: string;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
  created_by?: string;
}

export const WalletManagement = ({ companyId }: WalletManagementProps) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      fetchWallet();
      fetchTransactions();
    }

    // Check for successful payment from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('Payment successful! Your wallet will be updated shortly.');
      // Refresh wallet data
      setTimeout(() => {
        fetchWallet();
        fetchTransactions();
      }, 2000);
    } else if (urlParams.get('canceled') === 'true') {
      toast.error('Payment was canceled.');
    }
  }, [companyId]);

  const fetchWallet = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (!data) {
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

        setWallet(newWallet);
      } else {
        setWallet(data);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
      toast.error('Failed to fetch wallet information');
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const transformedTransactions: Transaction[] = (data as DatabaseTransaction[])?.map(transaction => ({
        ...transaction,
        type: transaction.type as 'credit' | 'debit' | 'refund'
      })) || [];
      
      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleDataRefresh = () => {
    fetchWallet();
    fetchTransactions();
  };

  if (loading) {
    return <div>Loading wallet information...</div>;
  }

  if (!companyId) {
    return <div>No company assigned to your account.</div>;
  }

  return (
    <div className="space-y-6">
      <WalletBalanceCards 
        balance={wallet?.balance || 0} 
        transactions={transactions} 
      />

      <WalletActions
        balance={wallet?.balance || 0}
        onManualAdd={() => setIsAddFundsDialogOpen(true)}
        onStripeAdd={() => setIsStripeDialogOpen(true)}
        companyId={companyId}
        onBalanceUpdated={handleDataRefresh}
      />

      <TransactionsTable transactions={transactions} />

      <ManualAddFundsDialog
        open={isAddFundsDialogOpen}
        onOpenChange={setIsAddFundsDialogOpen}
        wallet={wallet}
        companyId={companyId}
        onSuccess={handleDataRefresh}
      />

      <StripePaymentDialog
        open={isStripeDialogOpen}
        onOpenChange={setIsStripeDialogOpen}
        companyId={companyId}
        currentBalance={wallet?.balance || 0}
      />
    </div>
  );
};
