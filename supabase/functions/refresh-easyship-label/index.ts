import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function err(msg: string, status = 500, details?: unknown) {
  console.error('[refresh-easyship-label]', msg, details)
  return new Response(JSON.stringify({ error: msg }), { headers: corsHeaders, status })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 })

  try {
    const easyshipApiKey = Deno.env.get('EASYSHIP_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!easyshipApiKey || !supabaseUrl || !serviceKey || !anonKey) {
      return err('Configuration error', 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized', 401)
    const token = authHeader.replace('Bearer ', '')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const { data: authData, error: authErr } = await userClient.auth.getUser(token)
    const userId = authData?.user?.id
    if (authErr || !userId) return err('Unauthorized', 401, authErr?.message)

    let body: any
    try { body = await req.json() } catch { return err('Invalid JSON body', 400) }
    const shipmentId = Number(body?.shipmentId)
    if (!shipmentId || Number.isNaN(shipmentId)) return err('shipmentId required', 400)

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Resolve user's company
    const { data: userRow } = await admin
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle()
    if (!userRow?.company_id) return err('User has no company', 403)

    // Load shipment + tenant check
    const { data: shipment, error: shipErr } = await admin
      .from('shipments')
      .select('id, easypost_id, company_id, label_url, tracking_number, tracking_url')
      .eq('id', shipmentId)
      .maybeSingle()
    if (shipErr || !shipment) return err('Shipment not found', 404, shipErr?.message)
    if (shipment.company_id !== userRow.company_id) return err('Forbidden', 403)
    if (!shipment.easypost_id) return err('Shipment has no Easyship ID', 400)

    // Already have a label? Just return it.
    if (shipment.label_url) {
      return new Response(JSON.stringify({
        status: 'ready',
        labelUrl: shipment.label_url,
        trackingNumber: shipment.tracking_number,
        trackingUrl: shipment.tracking_url,
      }), { headers: corsHeaders })
    }

    const baseUrl = Deno.env.get('EASYSHIP_API_BASE_URL')
      ?? (easyshipApiKey.startsWith('sand_')
        ? 'https://public-api-sandbox.easyship.com'
        : 'https://public-api.easyship.com')

    const res = await fetch(`${baseUrl}/2024-09/shipments/${shipment.easypost_id}`, {
      headers: {
        'Authorization': `Bearer ${easyshipApiKey}`,
        'Accept': 'application/json',
      },
    })
    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    if (!res.ok) {
      return err(data?.error?.message || `Easyship API error ${res.status}`, 502, data)
    }

    const polledShipment = data.shipment || data
    const polledLabel = polledShipment.label || {}
    const labelUrl = polledLabel.label_url || polledLabel.url
    const trackingNumber = polledLabel.tracking_number || polledShipment.tracking_number
    const trackingUrl = polledLabel.tracking_page_url || polledShipment.tracking_page_url
    const labelState = polledShipment.label_state || polledLabel.state

    if (labelState === 'failed') {
      return new Response(JSON.stringify({
        status: 'failed',
        message: polledLabel.error_message || polledShipment.label_error || 'Label generation failed',
      }), { headers: corsHeaders })
    }

    if (!labelUrl) {
      return new Response(JSON.stringify({
        status: 'pending',
        labelState: labelState || 'unknown',
      }), { headers: corsHeaders })
    }

    const update: Record<string, any> = { label_url: labelUrl }
    if (trackingNumber) update.tracking_number = trackingNumber
    if (trackingUrl) update.tracking_url = trackingUrl

    const { error: upErr } = await admin
      .from('shipments')
      .update(update)
      .eq('id', shipment.id)
    if (upErr) console.warn('Failed to persist refreshed label:', upErr)

    return new Response(JSON.stringify({
      status: 'ready',
      labelUrl,
      trackingNumber: trackingNumber || shipment.tracking_number,
      trackingUrl: trackingUrl || shipment.tracking_url,
    }), { headers: corsHeaders })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unexpected error', 500, e)
  }
})
