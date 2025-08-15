
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, DollarSign } from "lucide-react";
import { EmbeddedStripePayment } from "./EmbeddedStripePayment";

interface StripePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  currentBalance: number;
  onPaymentSuccess?: () => void;
}

export const StripePaymentDialog = ({ 
  open, 
  onOpenChange, 
  companyId, 
  currentBalance,
  onPaymentSuccess
}: StripePaymentDialogProps) => {
  const [amount, setAmount] = useState('');
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowPaymentForm(false);
      setAmount('');
      setSavePaymentMethod(false);
    }
    onOpenChange(newOpen);
  };

  const handleContinueToPayment = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setAmount('');
    setSavePaymentMethod(false);
    onPaymentSuccess?.();
    handleOpenChange(false);
  };

  const handleCancel = () => {
    setShowPaymentForm(false);
    setAmount('');
    setSavePaymentMethod(false);
  };

  const suggestedAmounts = [50, 100, 250, 500];

  if (!companyId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {showPaymentForm ? "Complete Payment" : "Add Funds with Stripe"}
          </DialogTitle>
        </DialogHeader>
        
        {!showPaymentForm ? (
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
                onClick={handleContinueToPayment} 
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full"
              >
                Continue to Payment
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Secure payment powered by Stripe. Your payment information is encrypted and secure.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Adding to wallet</div>
              <div className="text-xl font-bold">
                ${parseFloat(amount).toFixed(2)}
              </div>
            </div>
            
            {showPaymentForm && (
              <EmbeddedStripePayment
                amount={parseFloat(amount)}
                companyId={companyId}
                savePaymentMethod={savePaymentMethod}
                onSuccess={handlePaymentSuccess}
                onCancel={handleCancel}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
