
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, userId }: WelcomeEmailRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseServiceKey) {
      throw new Error('Missing Supabase service role key');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Auto-confirming email for user:', email, 'with ID:', userId);
    
    // Add a small delay to ensure user is fully created in auth system
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Auto-confirm the user's email using the admin API
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        email_confirm: true,
        user_metadata: { 
          name: name,
          email_confirmed: true 
        }
      }
    );

    if (confirmError) {
      console.error('Error confirming user email:', confirmError);
      // Don't throw error - user creation should still succeed
      console.log('User creation succeeded despite confirmation error');
    } else {
      console.log('User email confirmed successfully for:', email);
    }

    return new Response(
      JSON.stringify({ message: 'User processing completed' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    // Return success even if there's an error to not block user creation
    return new Response(
      JSON.stringify({ message: 'User processing completed with warnings', warning: error.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
