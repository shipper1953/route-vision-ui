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

let stripePromise: Promise<any> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-key');
      
      if (error || !data?.publishableKey) {
        console.error('Failed to get Stripe publishable key:', error);
        throw new Error('Failed to get Stripe publishable key');
      }
      
      stripePromise = loadStripe(data.publishableKey);
    } catch (err) {
      console.error('Error in getStripe:', err);
      throw err;
    }
  }
  return stripePromise;
};

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
  const [isReady, setIsReady] = useState(false);

  console.log('[PaymentForm] Component mounted with:', { 
    clientSecret: !!clientSecret, 
    amount, 
    stripe: !!stripe, 
    elements: !!elements 
  });

  useEffect(() => {
    console.log('[PaymentForm] useEffect - stripe:', !!stripe, 'elements:', !!elements);
    if (stripe && elements) {
      console.log('[PaymentForm] Setting ready to true');
      setIsReady(true);
    }
  }, [stripe, elements]);

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

  console.log('[PaymentForm] Render state:', { isReady, stripe: !!stripe, elements: !!elements });

  if (!isReady) {
    console.log('[PaymentForm] Not ready, showing loading');
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading payment form...</p>
        <div className="mt-2 text-xs text-gray-500">
          Stripe: {stripe ? '✓' : '✗'} | Elements: {elements ? '✓' : '✗'}
        </div>
      </div>
    );
  }

  console.log('[PaymentForm] Ready, rendering form');

  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-100 border border-green-400 rounded">
        <p className="text-sm">DEBUG: PaymentForm ready to render</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-card">
            <div className="mb-2 text-sm text-gray-600">Payment Element should appear below:</div>
            <PaymentElement 
              options={{
                layout: "tabs",
                paymentMethodOrder: ['card'],
                fields: {
                  billingDetails: {
                    name: 'never',
                    email: 'never'
                  }
                }
              }}
              onReady={() => {
                console.log('[PaymentElement] onReady called');
              }}
              onChange={(event) => {
                console.log('[PaymentElement] onChange:', event);
              }}
              onLoadError={(error) => {
                console.error('[PaymentElement] onLoadError:', error);
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
    </div>
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
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  console.log('[EmbeddedStripePayment] Component mounted with:', { amount, companyId, savePaymentMethod });

  useEffect(() => {
    console.log('[EmbeddedStripePayment] useEffect triggered');
    
    const initializePayment = async () => {
      try {
        console.log('[EmbeddedStripePayment] Starting initialization');
        setLoading(true);
        setError(null);
        
        // Initialize Stripe
        console.log('[EmbeddedStripePayment] Getting Stripe instance');
        const stripe = await getStripe();
        console.log('[EmbeddedStripePayment] Stripe instance:', !!stripe);
        setStripeInstance(stripe);
        
        // Create payment intent
        console.log('[EmbeddedStripePayment] Creating payment intent with body:', {
          amount: Math.round(amount * 100),
          companyId,
          savePaymentMethod
        });
        
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            amount: Math.round(amount * 100),
            companyId,
            savePaymentMethod
          }
        });

        console.log('[EmbeddedStripePayment] Payment intent response:', { data, error });

        if (error) {
          console.error('[EmbeddedStripePayment] Payment intent error:', error);
          throw error;
        }

        console.log('[EmbeddedStripePayment] Setting clientSecret:', data.clientSecret);
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('[EmbeddedStripePayment] Error initializing payment:', err);
        setError('Failed to initialize payment: ' + (err as Error).message);
      } finally {
        setLoading(false);
        console.log('[EmbeddedStripePayment] Initialization complete');
      }
    };

    initializePayment();
  }, [amount, companyId, savePaymentMethod]);

  console.log('[EmbeddedStripePayment] Render state:', { 
    loading, 
    stripeInstance: !!stripeInstance, 
    clientSecret: !!clientSecret,
    error 
  });

  if (error) {
    console.log('[EmbeddedStripePayment] Showing error state:', error);
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  if (loading || !stripeInstance || !clientSecret) {
    console.log('[EmbeddedStripePayment] Showing loading state');
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
      variables: {
        colorPrimary: 'hsl(var(--primary))',
      },
    },
  };

  console.log('[EmbeddedStripePayment] Rendering Elements with options:', options);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-sm">DEBUG: Stripe ready, rendering payment form</p>
        <p className="text-xs">ClientSecret: {clientSecret ? 'Present' : 'Missing'}</p>
        <p className="text-xs">Stripe Instance: {stripeInstance ? 'Ready' : 'Missing'}</p>
      </div>
      <Elements stripe={stripeInstance} options={options} key={clientSecret}>
        <PaymentForm
          clientSecret={clientSecret}
          amount={Math.round(amount * 100)}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
};