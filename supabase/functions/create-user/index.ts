
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'company_admin' | 'super_admin';
  company_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, name, role, company_id }: CreateUserRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseServiceKey) {
      throw new Error('Missing Supabase service role key');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Creating user with service role:', { email, name, role, company_id });
    
    // Create user using Supabase Auth Admin API with immediate activation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Immediately confirm the email
      user_metadata: {
        name: name,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    console.log('User created in auth system:', authData.user?.id);

    // Wait a moment for any triggers to run
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the user's profile with role and company assignment
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authData.user.id,
          name: name,
          email: email,
          role: role,
          company_id: company_id === 'no_company' ? null : company_id,
          password: '', // Password is managed by Supabase auth
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'User created successfully',
        user: authData.user 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create user'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
