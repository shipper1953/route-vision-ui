-- Add stripe_customer_id to companies for persistent Stripe linkage
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Optional index for faster lookup
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id ON public.companies (stripe_customer_id);
