
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Received OPTIONS request to qboid-wifi-api-handler endpoint')
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  console.log('Received POST request to qboid-wifi-api-handler endpoint')

  try {
    // Parse the request body
    const body = await req.text()
    console.log('Received body:', body)

    let qboidData
    try {
      qboidData = JSON.parse(body)
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError)
      return new Response('Invalid JSON', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('Received data from Qboid device:', qboidData)

    // Get the API token from request headers or body
    const authHeader = req.headers.get('authorization')
    const apiToken = authHeader?.replace('Bearer ', '') || qboidData.token
    
    // SECURITY: Never log tokens, even presence check
    console.log('Token validation attempt')

    // Validate API token
    const expectedToken = Deno.env.get('QBOID_API_TOKEN')
    
    if (!expectedToken) {
      console.error('QBOID_API_TOKEN not configured')
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }
    if (!expectedToken) {
      console.error('QBOID_API_TOKEN not configured in environment')
      return new Response('Server configuration error', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    if (!apiToken || apiToken !== expectedToken) {
      console.error('Missing or invalid Qboid API token')
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    // Handle token validation requests
    if (qboidData.action === 'validate-token') {
      console.log('Token validation request - token is valid')
      return new Response(JSON.stringify({ status: 'valid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate that we have the required qboid measurement data
    if (!qboidData.l || !qboidData.w || !qboidData.h || !qboidData.weight) {
      console.error('Invalid Qboid data format - missing required fields')
      return new Response('Invalid data format', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('Parsed qboid data:', qboidData)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('Creating Supabase client with URL:', supabaseUrl ? 'URL provided' : 'No URL')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Convert qboid measurements to standard format (convert mm to inches, grams to pounds)
    const dimensions = {
      length: parseFloat((qboidData.l / 25.4).toFixed(2)), // mm to inches
      width: parseFloat((qboidData.w / 25.4).toFixed(2)),   // mm to inches  
      height: parseFloat((qboidData.h / 25.4).toFixed(2)),  // mm to inches
      weight: parseFloat((qboidData.weight / 453.592).toFixed(2)) // grams to pounds
    }

    console.log('Converted dimensions:', dimensions)

    // If we have a barcode, look up the item and update its dimensions
    if (qboidData.barcode) {
      console.log('Looking up item with SKU:', qboidData.barcode)
      
      const { data: item, error: lookupError } = await supabase
        .from('items')
        .select('*')
        .eq('sku', qboidData.barcode)
        .single()
      
      if (lookupError || !item) {
        console.error('Item not found for SKU:', qboidData.barcode)
        
        // Store pending dimensions in qboid_events
        await supabase
          .from('qboid_events')
          .insert({
            event_type: 'item_sku_not_found',
            data: {
              dimensions,
              sku: qboidData.barcode,
              timestamp: qboidData.timestamp || new Date().toISOString(),
              device: qboidData.device || 'unknown'
            }
          })
        
        return new Response(JSON.stringify({
          success: false,
          error: 'SKU not found in catalog',
          sku: qboidData.barcode,
          data: { dimensions }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        })
      }
      
      // Update item dimensions
      const { error: updateError } = await supabase
        .from('items')
        .update({
          length: dimensions.length,
          width: dimensions.width,
          height: dimensions.height,
          weight: dimensions.weight,
          dimensions_updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
      
      if (updateError) {
        console.error('Error updating item:', updateError)
        return new Response(JSON.stringify({ 
          error: 'Failed to update item dimensions' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        })
      }
      
      console.log(`Item ${item.sku} dimensions updated successfully`)
      
      // Publish realtime event for item update
      await supabase
        .from('qboid_events')
        .insert({
          event_type: 'item_dimensions_updated',
          data: {
            item_id: item.id,
            sku: qboidData.barcode,
            name: item.name,
            dimensions,
            timestamp: qboidData.timestamp || new Date().toISOString(),
            device: qboidData.device || 'unknown'
          }
        })
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Item dimensions updated successfully',
        data: {
          item_id: item.id,
          sku: item.sku,
          name: item.name,
          dimensions,
          timestamp: qboidData.timestamp || new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    } else {
      // No barcode, store pending dimensions
      await supabase
        .from('qboid_events')
        .insert({
          event_type: 'dimensions_pending',
          data: {
            dimensions,
            timestamp: qboidData.timestamp || new Date().toISOString(),
            device: qboidData.device || 'unknown'
          }
        })
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Dimensions captured. Please scan barcode to link to item.',
        data: { dimensions }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

  } catch (error) {
    console.error('Error processing qboid data:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})

console.log('Qboid WiFi API handler loaded')
