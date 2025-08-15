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

const stripePromise = loadStripe("pk_test_51Pp7dmBaAOl9o2jJMzc2UpjUAP6FyAzlm1zKBT1LQA1HHrQqfUNPNY6fDKOlgCT7hYlHNJkNQdZdDZK2wdDf5IaY00GKO0qUNp");

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

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            amount: Math.round(amount * 100), // Convert to cents
            companyId,
            savePaymentMethod
          }
        });

        if (error) {
          throw error;
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        toast.error('Failed to initialize payment');
        onCancel();
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [amount, companyId, savePaymentMethod, onCancel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading payment form...</span>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load payment form</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">
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
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        clientSecret={clientSecret}
        amount={Math.round(amount * 100)}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
};