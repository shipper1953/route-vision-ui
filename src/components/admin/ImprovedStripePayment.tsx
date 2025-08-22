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
  amount: number;
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm = ({ amount, companyId, onSuccess, onCancel }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'collecting' | 'processing'>('collecting');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('[ImprovedPayment] Submit clicked');

    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Payment system not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setPaymentStep('processing');

    try {
      // First, submit the elements to validate the form
      const { error: submitError } = await elements.submit();
      if (submitError) {
        console.error('[ImprovedPayment] Form validation error:', submitError);
        toast({
          title: "Form Validation Error",
          description: submitError.message,
          variant: "destructive"
        });
        setPaymentStep('collecting');
        setLoading(false);
        return;
      }

      // Then create a payment method from the validated form data
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
        params: {
          type: 'card',
        },
      });

      if (paymentMethodError) {
        console.error('[ImprovedPayment] Payment method error:', paymentMethodError);
        toast({
          title: "Payment Method Error",
          description: paymentMethodError.message,
          variant: "destructive"
        });
        setPaymentStep('collecting');
        setLoading(false);
        return;
      }

      console.log('[ImprovedPayment] Payment method created:', paymentMethod.id);

      // Now create the payment intent with the payment method
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          amount: Math.round(amount * 100),
          companyId,
          paymentMethodId: paymentMethod.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.clientSecret) {
        throw new Error('No client secret returned from payment intent');
      }

      console.log('[ImprovedPayment] Payment intent created, confirming...');

      // Confirm the payment
      const { error: confirmError } = await stripe.confirmPayment({
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        console.error('[ImprovedPayment] Payment confirmation error:', confirmError);
        toast({
          title: "Payment Failed",
          description: confirmError.message,
          variant: "destructive"
        });
      } else {
        console.log('[ImprovedPayment] Payment successful');
        toast({
          title: "Payment Successful",
          description: `$${amount.toFixed(2)} added to wallet.`
        });
        onSuccess();
      }
    } catch (err) {
      console.error('[ImprovedPayment] Unexpected error:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setPaymentStep('collecting');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 border rounded-lg bg-card">
          {!stripe || !elements ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading payment form...
            </div>
          ) : (
            <PaymentElement 
              options={{
                layout: "tabs",
              }}
              onReady={() => console.log('[PaymentElement] Ready')}
              onLoadError={(error) => console.error('[PaymentElement] Load error:', error)}
            />
          )}
        </div>
        
        {paymentStep === 'processing' && (
          <div className="text-center text-sm text-muted-foreground">
            Processing payment...
          </div>
        )}
      </div>
      
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || !elements || loading}
          className="flex-1"
        >
          {loading ? "Processing..." : `Pay $${amount.toFixed(2)}`}
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

interface ImprovedStripePaymentProps {
  amount: number;
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ImprovedStripePayment = ({
  amount,
  companyId,
  onSuccess,
  onCancel,
}: ImprovedStripePaymentProps) => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        console.log('[ImprovedStripe] Initializing Stripe');
        setLoading(true);
        setError(null);
        
        // Get Stripe publishable key
        const { data: keyData, error: keyError } = await supabase.functions.invoke('get-stripe-key');
        
        if (keyError || !keyData?.publishableKey) {
          throw new Error('Failed to get Stripe publishable key: ' + (keyError?.message || 'No key returned'));
        }
        
        console.log('[ImprovedStripe] Got publishable key, loading Stripe...');
        const stripe = loadStripe(keyData.publishableKey);
        setStripePromise(stripe);
        
      } catch (err) {
        console.error('[ImprovedStripe] Error initializing Stripe:', err);
        setError('Failed to initialize payment system: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    initializeStripe();
  }, []);

  const handleTryFallback = async () => {
    console.log('[ImprovedStripe] Trying fallback checkout');
    try {
      const { data, error } = await supabase.functions.invoke('create-wallet-payment', {
        body: {
          amount: Math.round(amount * 100),
          companyId,
          savePaymentMethod: false
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('No checkout URL received');
      }

      // Open in new tab
      window.open(data.url, '_blank');
      onCancel(); // Close the dialog
    } catch (err) {
      console.error('[ImprovedStripe] Fallback error:', err);
      toast({
        title: "Error",
        description: "Failed to open alternative payment method",
        variant: "destructive"
      });
    }
  };

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-destructive mb-4">{error}</p>
        <div className="space-y-2">
          <Button onClick={handleTryFallback} className="w-full">
            Try Alternative Payment Method
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !stripePromise) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading payment form...</span>
      </div>
    );
  }

  if (showFallback) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground mb-4">
          Having trouble with the payment form? Try our alternative payment method.
        </p>
        <div className="space-y-2">
          <Button onClick={handleTryFallback} className="w-full">
            Open Stripe Checkout
          </Button>
          <Button variant="outline" onClick={() => setShowFallback(false)} className="w-full">
            Try Embedded Form Again
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const options = {
    mode: 'payment' as const,
    amount: Math.round(amount * 100),
    currency: 'usd',
    paymentMethodCreation: 'manual' as const,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="space-y-4">
      <Elements stripe={stripePromise} options={options}>
        <PaymentForm
          amount={amount}
          companyId={companyId}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
      
      <div className="text-center">
        <Button
          variant="link"
          size="sm"
          onClick={() => setShowFallback(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          Having trouble? Try alternative payment method
        </Button>
      </div>
    </div>
  );
};