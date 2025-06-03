import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Transaction } from "@/types/auth";
import { Plus, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import { StripePaymentDialog } from "./StripePaymentDialog";

interface WalletManagementProps {
  companyId?: string;
}

interface DatabaseTransaction {
  id: string;
  wallet_id: string;
  company_id: string;
  amount: number;
  type: string; // This comes as string from database
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
  const [addFundsAmount, setAddFundsAmount] = useState('');

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
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      setWallet(data);
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
      
      // Transform database transactions to match our type
      const transformedTransactions: Transaction[] = (data as DatabaseTransaction[])?.map(transaction => ({
        ...transaction,
        type: transaction.type as 'credit' | 'debit' | 'refund' // Cast to proper type
      })) || [];
      
      setTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

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
      setIsAddFundsDialogOpen(false);
      fetchWallet();
      fetchTransactions();
      toast.success('Funds added successfully');
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error('Failed to add funds');
    }
  };

  if (loading) {
    return <div>Loading wallet information...</div>;
  }

  if (!companyId) {
    return <div>No company assigned to your account.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${wallet?.balance?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for shipments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              Total spent this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Added</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${transactions
                .filter(t => t.type === 'credit')
                .reduce((sum, t) => sum + t.amount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total funds added
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wallet Management</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAddFundsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Manual Add
              </Button>
              <Button onClick={() => setIsStripeDialogOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Add Funds
              </Button>
            </div>
            
            {/* Manual add funds dialog */}
            <Dialog open={isAddFundsDialogOpen} onOpenChange={setIsAddFundsDialogOpen}>
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
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Add funds to your wallet to pay for shipping labels and services. 
            Use Stripe for secure credit card or bank account payments.
          </p>
          
          <div className="text-lg font-semibold">
            Current Balance: ${wallet?.balance?.toFixed(2) || '0.00'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        transaction.type === 'credit' ? 'default' : 
                        transaction.type === 'debit' ? 'destructive' : 'secondary'
                      }>
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <span className={
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }>
                        {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StripePaymentDialog
        open={isStripeDialogOpen}
        onOpenChange={setIsStripeDialogOpen}
        companyId={companyId}
        currentBalance={wallet?.balance || 0}
      />
    </div>
  );
};
