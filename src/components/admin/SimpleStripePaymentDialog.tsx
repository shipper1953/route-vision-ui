import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, DollarSign } from "lucide-react";
import { WorkingStripePayment } from "./WorkingStripePayment";

interface SimpleStripePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  currentBalance: number;
  onPaymentSuccess?: () => void;
}

export const SimpleStripePaymentDialog = ({ 
  open, 
  onOpenChange, 
  companyId, 
  currentBalance,
  onPaymentSuccess
}: SimpleStripePaymentDialogProps) => {
  const [amount, setAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }
    setShowPayment(true);
  };

  const handleSuccess = () => {
    setShowPayment(false);
    setAmount('');
    onPaymentSuccess?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    setShowPayment(false);
  };

  const handleClose = () => {
    setShowPayment(false);
    setAmount('');
    onOpenChange(false);
  };

  const suggestedAmounts = [50, 100, 250, 500];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Real Stripe Payment
          </DialogTitle>
        </DialogHeader>
        
        {!showPayment ? (
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

            <Button 
              onClick={handleContinue} 
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full"
            >
              Continue to Payment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Adding to wallet</div>
              <div className="text-xl font-bold">
                ${parseFloat(amount).toFixed(2)}
              </div>
            </div>
            
            {companyId && (
              <WorkingStripePayment
                amount={parseFloat(amount)}
                companyId={companyId}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};