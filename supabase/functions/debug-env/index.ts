import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require authentication and super_admin role
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user has super_admin role
    const { data: roleCheck, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'super_admin'
    });

    if (roleError || !roleCheck) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: super_admin role required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Debug endpoint called by super_admin:', user.email);
    
    const allEnvVars = Deno.env.toObject();
    
    // Filter out sensitive info but show what's available
    const envInfo = Object.keys(allEnvVars).reduce((acc, key) => {
      if (key.includes('EASYPOST') || key.includes('SUPABASE') || key.includes('STRIPE')) {
        acc[key] = key.includes('KEY') || key.includes('SECRET') 
          ? (allEnvVars[key] ? `SET (${allEnvVars[key].length} chars)` : 'NOT SET')
          : 'Available';
      }
      return acc;
    }, {} as Record<string, string>);
    
    const response = {
      message: 'Environment diagnostics (super_admin only)',
      user: user.email,
      totalEnvVars: Object.keys(allEnvVars).length,
      relevantVars: envInfo,
      easypostApiKey: {
        exists: !!Deno.env.get('EASYPOST_API_KEY'),
        value: Deno.env.get('EASYPOST_API_KEY') ? 'PRESENT' : 'MISSING'
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('Environment diagnostic result:', response);
    
    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    return new Response(JSON.stringify({ 
      error: 'Diagnostic failed', 
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
