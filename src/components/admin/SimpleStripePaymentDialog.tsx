import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!companyId) {
      toast.error("Company ID is required");
      return;
    }

    setLoading(true);
    
    try {
      console.log('Creating payment intent for amount:', numAmount);
      
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: Math.round(numAmount * 100), // Convert to cents
          companyId,
          savePaymentMethod: false
        }
      });

      if (error) {
        console.error('Payment intent error:', error);
        throw error;
      }

      console.log('Payment intent created:', data);
      
      if (data.clientSecret) {
        // For testing, let's just simulate a successful payment
        toast.success(`Test: Would process $${numAmount} payment`);
        onPaymentSuccess?.();
        onOpenChange(false);
        setAmount('');
      } else {
        throw new Error('No client secret received');
      }
      
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(`Payment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const suggestedAmounts = [50, 100, 250, 500];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Test Payment Dialog
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

          <div className="space-y-2">
            <Button 
              onClick={handlePayment} 
              disabled={!amount || parseFloat(amount) <= 0 || loading}
              className="w-full"
            >
              {loading ? "Processing..." : `Test Payment $${amount || "0"}`}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              This is a test dialog to verify the payment intent creation works.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};