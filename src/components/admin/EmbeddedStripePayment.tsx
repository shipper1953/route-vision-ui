import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

let stripePromise: Promise<any> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    // Get the publishable key from the edge function
    const { data, error } = await supabase.functions.invoke('get-stripe-key');
    
    if (error || !data?.publishableKey) {
      throw new Error('Failed to get Stripe publishable key');
    }
    
    stripePromise = loadStripe(data.publishableKey);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href, // This won't be used since we handle success here
        },
        redirect: "if_required", // Prevents automatic redirect
      });

      if (error) {
        toast.error(error.message || "Payment failed");
      } else {
        toast.success(`Payment successful! $${(amount / 100).toFixed(2)} added to wallet.`);
        onSuccess();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-h-[120px]">
        <PaymentElement 
          options={{
            layout: "tabs"
          }}
        />
      </div>
      
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || loading}
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
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('EmbeddedStripePayment mounted with amount:', amount, 'companyId:', companyId);
    
    const initializeStripe = async () => {
      try {
        console.log('Initializing Stripe...');
        const stripe = await getStripe();
        console.log('Stripe initialized successfully');
        setStripeInstance(stripe);
      } catch (err) {
        console.error('Error initializing Stripe:', err);
        setError('Failed to initialize Stripe');
        setLoading(false);
      }
    };

    // Only initialize once
    if (!stripeInstance) {
      initializeStripe();
    }
  }, []); // Remove dependencies to prevent re-initialization

  useEffect(() => {
    if (!stripeInstance || !companyId || clientSecret) return; // Don't recreate if we already have a clientSecret

    const createPaymentIntent = async () => {
      try {
        console.log('Creating payment intent...');
        setError(null);
        setLoading(true);
        
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            amount: Math.round(amount * 100), // Convert to cents
            companyId,
            savePaymentMethod
          }
        });

        if (error) {
          console.error('Payment intent error:', error);
          throw error;
        }

        console.log('Payment intent created successfully');
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError('Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, companyId, savePaymentMethod, stripeInstance]); // Keep these dependencies but prevent re-creation

  if (error) {
    console.log('EmbeddedStripePayment: Showing error state:', error);
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
    console.log('EmbeddedStripePayment: Showing loading state. Loading:', loading, 'StripeInstance:', !!stripeInstance, 'ClientSecret:', !!clientSecret);
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading payment form...</span>
      </div>
    );
  }

  console.log('EmbeddedStripePayment: Rendering payment form with clientSecret:', clientSecret);

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="stripe-payment-container">
      <Elements stripe={stripeInstance} options={options}>
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