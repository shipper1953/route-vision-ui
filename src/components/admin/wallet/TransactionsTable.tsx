
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/types/auth";
import { useNavigate } from "react-router-dom";

interface TransactionsTableProps {
  transactions: Transaction[];
}

function extractOrderId(description?: string): string | null {
  if (!description) return null;
  const match = description.match(/Order #(\d+)/);
  return match ? match[1] : null;
}

export const TransactionsTable = ({ transactions }: TransactionsTableProps) => {
  const navigate = useNavigate();

  return (
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
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const orderId = extractOrderId(transaction.description);
                return (
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
                    <TableCell>
                      {orderId ? (
                        <button
                          className="text-primary underline hover:text-primary/80 font-medium"
                          onClick={() => navigate(`/orders?orderId=${orderId}`)}
                        >
                          #{orderId}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }>
                        {transaction.type === 'credit' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
