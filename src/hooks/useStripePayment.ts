
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useStripePayment = (companyId?: string) => {
  const [loading, setLoading] = useState(false);

  const createPaymentSession = async (amount: number, savePaymentMethod = false) => {
    if (!companyId) {
      toast.error("Company ID is required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-wallet-payment', {
        body: {
          amount: Math.round(amount * 100), // Convert to cents
          companyId,
          savePaymentMethod
        }
      });

      if (error) {
        throw error;
      }

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating payment session:', error);
      toast.error('Failed to create payment session');
    } finally {
      setLoading(false);
    }
  };

  return {
    createPaymentSession,
    loading
  };
};
