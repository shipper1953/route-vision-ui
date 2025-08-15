import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm = ({ clientSecret, amount, onSuccess, onCancel }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Payment system not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "Payment failed",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Payment Successful",
          description: `$${(amount / 100).toFixed(2)} added to wallet.`
        });
        onSuccess();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 border rounded-lg bg-card">
          <PaymentElement 
            options={{
              layout: "tabs",
            }}
          />
        </div>
      </div>
      
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || !elements || loading}
          className="flex-1"
        >
          {loading ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

interface EmbeddedStripePaymentProps {
  amount: number;
  companyId: string;
  savePaymentMethod?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EmbeddedStripePayment = ({
  amount,
  companyId,
  savePaymentMethod = false,
  onSuccess,
  onCancel,
}: EmbeddedStripePaymentProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get Stripe publishable key
        const { data: keyData, error: keyError } = await supabase.functions.invoke('get-stripe-key');
        
        if (keyError || !keyData?.publishableKey) {
          throw new Error('Failed to get Stripe publishable key');
        }
        
        // Initialize Stripe
        const stripe = loadStripe(keyData.publishableKey);
        setStripePromise(stripe);
        
        // Create payment intent
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            amount: Math.round(amount * 100),
            companyId,
            savePaymentMethod
          }
        });

        if (error) {
          throw error;
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error initializing payment:', err);
        setError('Failed to initialize payment: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [amount, companyId, savePaymentMethod]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  if (loading || !stripePromise || !clientSecret) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading payment form...</span>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Elements 
      stripe={stripePromise} 
      options={options}
      key={clientSecret} // Force remount when clientSecret changes
    >
      <PaymentForm
        clientSecret={clientSecret}
        amount={Math.round(amount * 100)}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
};