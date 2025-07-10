import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const allEnvVars = Deno.env.toObject()
    
    // Filter out sensitive info but show what's available
    const envInfo = Object.keys(allEnvVars).reduce((acc, key) => {
      if (key.includes('EASYPOST') || key.includes('SUPABASE')) {
        acc[key] = key.includes('KEY') || key.includes('SECRET') 
          ? (allEnvVars[key] ? `SET (${allEnvVars[key].length} chars)` : 'NOT SET')
          : 'Available'
      }
      return acc
    }, {} as Record<string, string>)
    
    const response = {
      message: 'Environment diagnostics',
      totalEnvVars: Object.keys(allEnvVars).length,
      relevantVars: envInfo,
      easypostApiKey: {
        exists: !!Deno.env.get('EASYPOST_API_KEY'),
        value: Deno.env.get('EASYPOST_API_KEY') ? 'PRESENT' : 'MISSING'
      },
      timestamp: new Date().toISOString()
    }
    
    console.log('Environment diagnostic result:', response)
    
    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Diagnostic error:', error)
    return new Response(JSON.stringify({ 
      error: 'Diagnostic failed', 
      details: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})