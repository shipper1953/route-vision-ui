
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

export async function authenticateUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
  
  const jwt = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
  
  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }
  
  if (!user) {
    throw new Error('User not found');
  }

  console.log('User authenticated successfully:', user.email, 'User ID:', user.id);
  return user;
}

export async function getUserCompany(userId: string) {
  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const { data: userData, error: userError } = await supabaseService
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (userError || !userData?.company_id) {
    throw new Error('User company not found');
  }

  return userData.company_id;
}
