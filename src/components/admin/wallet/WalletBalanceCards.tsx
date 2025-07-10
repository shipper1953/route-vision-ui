
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import { Transaction } from "@/types/auth";

interface WalletBalanceCardsProps {
  balance: number;
  transactions: Transaction[];
}

export const WalletBalanceCards = ({ balance, transactions }: WalletBalanceCardsProps) => {
  const totalAdded = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate monthly spend (debit transactions for current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlySpend = transactions
    .filter(t => {
      const transactionDate = new Date(t.created_at);
      return t.type === 'debit' && 
             transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0); // Use Math.abs since debit amounts are negative

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${balance.toFixed(2)}
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
          <div className="text-2xl font-bold">${monthlySpend.toFixed(2)}</div>
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
            ${totalAdded.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total funds added
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
