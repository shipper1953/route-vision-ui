import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

console.log('=== CREATE-SHIPPO-SHIPMENT FUNCTION v1.0 ===')

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function createErrorResponse(error: string, details?: any, status: number = 500): Response {
  console.log('🔴 Creating error response:', error, details)
  return new Response(JSON.stringify({ error, details }), {
    headers: corsHeaders,
    status,
  })
}

function createSuccessResponse(data: any): Response {
  console.log('🟢 Creating success response')
  return new Response(JSON.stringify(data), {
    headers: corsHeaders,
    status: 200,
  })
}

async function createShippoShipment(shipmentData: any, apiKey: string) {
  console.log('🚢 Creating Shippo shipment with data:', JSON.stringify(shipmentData, null, 2))
  
  // Convert EasyPost format to Shippo format
  const shippoData = {
    address_from: {
      name: shipmentData.from_address.name,
      company: shipmentData.from_address.company || '',
      street1: shipmentData.from_address.street1,
      street2: shipmentData.from_address.street2 || '',
      city: shipmentData.from_address.city,
      state: shipmentData.from_address.state,
      zip: shipmentData.from_address.zip,
      country: shipmentData.from_address.country || 'US',
      phone: shipmentData.from_address.phone || '',
      email: shipmentData.from_address.email || ''
    },
    address_to: {
      name: shipmentData.to_address.name,
      company: shipmentData.to_address.company || '',
      street1: shipmentData.to_address.street1,
      street2: shipmentData.to_address.street2 || '',
      city: shipmentData.to_address.city,
      state: shipmentData.to_address.state,
      zip: shipmentData.to_address.zip,
      country: shipmentData.to_address.country || 'US',
      phone: shipmentData.to_address.phone || '',
      email: shipmentData.to_address.email || ''
    },
    parcels: [{
      length: shipmentData.parcel.length,
      width: shipmentData.parcel.width,
      height: shipmentData.parcel.height,
      distance_unit: 'in',
      weight: shipmentData.parcel.weight,
      mass_unit: 'lb'
    }],
    async: false // Get rates immediately
  }
  
  console.log('📦 Converted Shippo data:', JSON.stringify(shippoData, null, 2))
  
  // Add specific address validation logging
  console.log('🏠 Address validation check:')
  console.log('   To Name:', shippoData.address_to.name)
  console.log('   To Company:', shippoData.address_to.company)
  console.log('   To Street1:', shippoData.address_to.street1)
  console.log('   To City:', shippoData.address_to.city)
  console.log('   To State:', shippoData.address_to.state)
  console.log('   To Zip:', shippoData.address_to.zip)
  console.log('   To Phone:', shippoData.address_to.phone)
  console.log('   To Email:', shippoData.address_to.email)
  
  // Check for missing required fields
  const missingFields = []
  if (!shippoData.address_to.name) missingFields.push('name')
  if (!shippoData.address_to.street1) missingFields.push('street1')
  if (!shippoData.address_to.city) missingFields.push('city')
  if (!shippoData.address_to.state) missingFields.push('state')
  if (!shippoData.address_to.zip) missingFields.push('zip')
  
  if (missingFields.length > 0) {
    console.error('❌ Missing required address fields:', missingFields)
    throw new Error(`Missing required address fields: ${missingFields.join(', ')}`)
  }
  
  const response = await fetch('https://api.goshippo.com/shipments/', {
    method: 'POST',
    headers: {
      'Authorization': `ShippoToken ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(shippoData),
  })
  
  const responseText = await response.text()
  let responseData
  
  try {
    responseData = JSON.parse(responseText)
  } catch (err) {
    responseData = { raw_response: responseText }
  }
  
  if (!response.ok) {
    console.error('❌ Shippo API error:', responseData)
    throw new Error(responseData.detail || 'Failed to create Shippo shipment')
  }
  
  console.log('✅ Shippo shipment created successfully')
  console.log('📊 Rates returned:', responseData.rates?.length || 0)
  
  return responseData
}

serve(async (req) => {
  console.log('=== CREATE SHIPPO SHIPMENT FUNCTION START ===')
  console.log('Request method:', req.method)
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    console.log('Processing create-shippo-shipment request...')
    
    // Check environment variables
    console.log('🔑 Checking environment variables...')
    const apiKey = Deno.env.get('SHIPPO_API_KEY')
    
    if (!apiKey) {
      console.error('❌ Missing SHIPPO_API_KEY environment variable')
      return createErrorResponse('Configuration error', 'SHIPPO_API_KEY not configured', 500)
    }
    console.log('✅ Shippo API key configured')
    
    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
      console.log('📥 Request body parsed:', JSON.stringify(requestBody, null, 2))
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return createErrorResponse('Invalid JSON in request body', parseError.message, 400)
    }
    
    const { shipmentData } = requestBody
    
    if (!shipmentData) {
      console.error('❌ Missing shipmentData in request')
      return createErrorResponse('Missing required parameter: shipmentData', null, 400)
    }
    
    console.log('📦 Creating Shippo shipment...')
    
    // Create shipment with Shippo
    console.log('📡 Calling Shippo API...')
    const shipmentResponse = await createShippoShipment(shipmentData, apiKey)
    console.log('✅ Shippo shipment created successfully:', shipmentResponse.object_id)
    
    console.log('🎉 Returning successful response')
    return createSuccessResponse(shipmentResponse)
    
  } catch (err) {
    console.error('💥 === ERROR IN CREATE SHIPPO SHIPMENT FUNCTION ===')
    console.error('Error type:', typeof err)
    console.error('Error constructor:', err.constructor?.name)
    console.error('Error message:', err.message)
    console.error('Error stack:', err.stack)
    
    console.log('🔴 Returning generic error response')
    return createErrorResponse('Internal server error', err.message, 500)
  }
})