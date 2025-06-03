
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseServiceKey) {
      throw new Error('Missing Supabase service role key');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auto-confirm the user's email since we want immediate access
    const { data: user, error: getUserError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (getUserError) {
      console.error('Error getting user by email:', getUserError);
      throw getUserError;
    }

    if (user?.user && !user.user.email_confirmed_at) {
      console.log('Auto-confirming email for user:', email);
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        user.user.id,
        { 
          email_confirm: true,
          user_metadata: { name: name }
        }
      );

      if (confirmError) {
        console.error('Error confirming user email:', confirmError);
        throw confirmError;
      }
    }

    return new Response(
      JSON.stringify({ message: 'User email confirmed successfully' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
