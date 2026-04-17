import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EASYSHIP_BASE_URL = 'https://public-api.easyship.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('EASYSHIP_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Easyship API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const body = await req.json();
    const shipmentData = body.shipmentData || body.shipment_data;
    if (!shipmentData) {
      return new Response(
        JSON.stringify({ error: 'shipmentData is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const from = shipmentData.from_address;
    const to = shipmentData.to_address;
    const parcel = shipmentData.parcel;

    // Easyship expects metric units in the request body (kg/cm).
    // shipping_settings.units controls the response display, not the request payload.
    const LB_TO_KG = 0.453592;
    const IN_TO_CM = 2.54;
    const weightKg = Number((parcel.weight * LB_TO_KG).toFixed(3));
    const lengthCm = Number((parcel.length * IN_TO_CM).toFixed(2));
    const widthCm = Number((parcel.width * IN_TO_CM).toFixed(2));
    const heightCm = Number((parcel.height * IN_TO_CM).toFixed(2));

    // Easyship rate request payload (v2024-09)
    // Docs: https://developers.easyship.com/reference/rates_request
    const payload = {
      origin_address: {
        line_1: from.street1,
        line_2: from.street2 || '',
        city: from.city,
        state: from.state,
        postal_code: from.zip,
        country_alpha2: (from.country || 'US').toUpperCase(),
        contact_name: from.name || 'Sender',
        company_name: from.company || '',
        contact_phone: from.phone || '5555555555',
        contact_email: from.email || 'sender@example.com',
      },
      destination_address: {
        line_1: to.street1,
        line_2: to.street2 || '',
        city: to.city,
        state: to.state,
        postal_code: to.zip,
        country_alpha2: (to.country || 'US').toUpperCase(),
        contact_name: to.name || 'Recipient',
        company_name: to.company || '',
        contact_phone: to.phone || '5555555555',
        contact_email: to.email || 'recipient@example.com',
      },
      parcels: [
        {
          total_actual_weight: weightKg,
          box: {
            length: lengthCm,
            width: widthCm,
            height: heightCm,
            slug: 'custom',
          },
          items: [
            {
              description: 'Merchandise',
              hs_code: '420299', // Generic merchandise HS code (other articles)
              quantity: 1,
              actual_weight: weightKg,
              declared_currency: 'USD',
              declared_customs_value: 1,
              dimensions: {
                length: lengthCm,
                width: widthCm,
                height: heightCm,
              },
            },
          ],
        },
      ],
      incoterms: 'DDU',
      courier_settings: {
        show_courier_logo_url: true,
        apply_shipping_rules: true,
      },
      shipping_settings: {
        units: {
          weight: 'kg',
          dimensions: 'cm',
        },
        output_currency: 'USD',
      },
      // Skip tax/duty lookup for domestic shipments (faster + avoids unnecessary calculations)
      calculate_tax_and_duties:
        (from.country || 'US').toUpperCase() !== (to.country || 'US').toUpperCase(),
    };

    console.log('📡 Easyship rates request:', JSON.stringify(payload).slice(0, 500));

    // Retry with exponential backoff for 429 rate limits
    let response: Response;
    let attempt = 0;
    const maxAttempts = 4;
    while (true) {
      response = await fetch(`${EASYSHIP_BASE_URL}/2024-09/rates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status !== 429 || attempt >= maxAttempts - 1) break;
      const delay = Math.min(2000 * Math.pow(2, attempt), 8000) + Math.floor(Math.random() * 500);
      console.warn(`⏳ Easyship 429, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      console.error('Easyship rates error:', response.status, data);
      return new Response(
        JSON.stringify({ error: 'Easyship API error', status: response.status, details: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const rates = (data.rates || []).map((r: any) => {
      const courierService = r.courier_service || {};
      const courierId = r.courier_id || courierService.courier_id || r.id;
      const carrierName = r.courier_name || courierService.umbrella_name || courierService.name || 'Easyship';
      const serviceName = r.service_name || courierService.name || r.full_description || carrierName;
      const courierLogoUrl = r.courier_logo_url || courierService.logo;

      return {
        object_id: courierId,
        rate_id: courierId,
        courier_id: courierId,
        courier_name: carrierName,
        courier_logo_url: courierLogoUrl,
        service_name: serviceName,
        total_charge: r.total_charge,
        currency: r.currency || 'USD',
        min_delivery_time: r.min_delivery_time,
        max_delivery_time: r.max_delivery_time,
        delivery_days: r.max_delivery_time || r.min_delivery_time,
        tracking_rating: r.tracking_rating,
        ddp_handling_fee: r.ddp_handling_fee,
        raw: r,
      };
    });

    const responsePayload = {
      object_id: `easyship_${Date.now()}`,
      rates,
      raw: data,
    };

    console.log(`✅ Easyship returned ${rates.length} rates`);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('💥 create-easyship-shipment error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
