-- Force refresh the user session by updating the updated_at timestamp
-- This will help trigger any cached data to refresh
UPDATE users 
SET email = email  -- This is a no-op update that will trigger timestamp updates
WHERE email = 'tagregg22@gmail.com';

-- Also verify the user exists with correct role
SELECT id, name, email, role, company_id FROM users WHERE email = 'tagregg22@gmail.com';