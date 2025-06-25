
-- Enable RLS on orders table (if not already enabled)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy for users to insert their own orders
CREATE POLICY "Users can insert their own orders" ON orders
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to view their own company's orders
CREATE POLICY "Users can view company orders" ON orders
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Policy for users to update their own company's orders
CREATE POLICY "Users can update company orders" ON orders
FOR UPDATE USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
) WITH CHECK (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Policy for users to delete their own company's orders
CREATE POLICY "Users can delete company orders" ON orders
FOR DELETE USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);
