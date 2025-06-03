
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, DollarSign } from "lucide-react";
import { useStripePayment } from "@/hooks/useStripePayment";

interface StripePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  currentBalance: number;
}

export const StripePaymentDialog = ({ 
  open, 
  onOpenChange, 
  companyId, 
  currentBalance 
}: StripePaymentDialogProps) => {
  const [amount, setAmount] = useState('');
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const { createPaymentSession, loading } = useStripePayment(companyId);

  const handlePayment = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    await createPaymentSession(numAmount, savePaymentMethod);
    onOpenChange(false);
    setAmount('');
    setSavePaymentMethod(false);
  };

  const suggestedAmounts = [50, 100, 250, 500];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Funds with Stripe
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Current Balance</div>
            <div className="text-2xl font-bold text-green-600">
              ${currentBalance.toFixed(2)}
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="amount">Amount to Add ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {suggestedAmounts.map((suggestedAmount) => (
              <Button
                key={suggestedAmount}
                variant="outline"
                size="sm"
                onClick={() => setAmount(suggestedAmount.toString())}
                className="text-xs"
              >
                ${suggestedAmount}
              </Button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="save-payment"
              checked={savePaymentMethod}
              onCheckedChange={(checked) => setSavePaymentMethod(checked as boolean)}
            />
            <Label htmlFor="save-payment" className="text-sm">
              Save payment method for future use
            </Label>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handlePayment} 
              disabled={!amount || parseFloat(amount) <= 0 || loading}
              className="w-full"
            >
              {loading ? "Processing..." : `Add $${amount || "0"} to Wallet`}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Secure payment powered by Stripe. Supports credit cards and bank accounts.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
