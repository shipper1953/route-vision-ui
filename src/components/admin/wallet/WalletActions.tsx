
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard } from "lucide-react";

interface WalletActionsProps {
  balance: number;
  onManualAdd: () => void;
  onStripeAdd: () => void;
}

export const WalletActions = ({ balance, onManualAdd, onStripeAdd }: WalletActionsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Wallet Management</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onManualAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Manual Add
            </Button>
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
