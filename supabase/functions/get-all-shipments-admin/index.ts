
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseServiceKey) {
      console.error("No service role key available");
      return new Response(
        JSON.stringify({ error: 'Service role key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching ALL shipments using service role...");

    // Get ALL shipments using service role to bypass RLS
    const { data: shipmentsData, error: shipmentsError } = await supabaseAdmin
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });

    console.log("Service role shipments query result:", { data: shipmentsData, error: shipmentsError });

    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError);
      throw shipmentsError;
    }

    // Get all companies for lookup
    const { data: companiesData, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name, markup_type, markup_value');

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
    }

    // Get all users to link shipments to companies through user_id
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, company_id');

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    return new Response(
      JSON.stringify({
        shipments: shipmentsData || [],
        companies: companiesData || [],
        users: usersData || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-all-shipments-admin function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
