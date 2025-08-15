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

// Initialize Stripe once outside the component
let stripePromise: Promise<any> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    const { data, error } = await supabase.functions.invoke('get-stripe-key');
    if (error || !data?.publishableKey) {
      throw new Error('Failed to get Stripe publishable key');
    }
    stripePromise = loadStripe(data.publishableKey);
  }
  return stripePromise;
};

interface WorkingPaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const WorkingPaymentForm = ({ clientSecret, amount, onSuccess, onCancel }: WorkingPaymentFormProps) => {
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
          return_url: window.location.href,
        },
        redirect: "if_required",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
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

interface WorkingStripePaymentProps {
  amount: number;
  companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const WorkingStripePayment = ({
  amount,
  companyId,
  onSuccess,
  onCancel,
}: WorkingStripePaymentProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripe, setStripe] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        console.log('Working payment: Initializing...');
        
        // Initialize Stripe and create payment intent in parallel
        const [stripeInstance, paymentIntent] = await Promise.all([
          getStripe(),
          supabase.functions.invoke('create-payment-intent', {
            body: {
              amount: Math.round(amount * 100),
              companyId,
              savePaymentMethod: false
            }
          })
        ]);

        if (!mounted) return;

        if (paymentIntent.error) {
          throw paymentIntent.error;
        }

        console.log('Working payment: Both initialized successfully');
        setStripe(stripeInstance);
        setClientSecret(paymentIntent.data.clientSecret);
      } catch (err) {
        console.error('Working payment error:', err);
        if (mounted) {
          toast.error('Failed to initialize payment');
          onCancel();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [amount, companyId, onCancel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading secure payment form...</span>
      </div>
    );
  }

  if (!stripe || !clientSecret) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Failed to load payment form</p>
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
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
    <Elements stripe={stripe} options={options}>
      <WorkingPaymentForm
        clientSecret={clientSecret}
        amount={Math.round(amount * 100)}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
};