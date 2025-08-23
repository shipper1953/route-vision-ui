import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Package {
  length: number;
  width: number;
  height: number;
  weight: number;
  description?: string;
  nmfc_code?: string;
  freight_class?: number;
}

interface ShipmentData {
  from_address: any;
  to_address: any;
  packages: Package[];
  company_id: string;
  user_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shipment_data }: { shipment_data: ShipmentData } = await req.json();
    console.log('Enhanced rate shopping request:', shipment_data);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Calculate total shipment characteristics
    const totalWeight = shipment_data.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
    const totalPackages = shipment_data.packages.length;
    const maxDimension = Math.max(
      ...shipment_data.packages.flatMap(pkg => [pkg.length, pkg.width, pkg.height])
    );

    console.log(`Shipment analysis: ${totalWeight}lbs, ${totalPackages} packages, max dimension: ${maxDimension}"`);

    // 2. Create shipment record
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        user_id: shipment_data.user_id,
        company_id: shipment_data.company_id,
        from_address: shipment_data.from_address,
        to_address: shipment_data.to_address,
        total_weight: totalWeight,
        package_count: totalPackages,
        status: 'draft',
        carrier: 'multiple', // We're comparing multiple carriers
        service: 'rate_shopping'
      })
      .select()
      .single();

    if (shipmentError || !shipment) {
      throw new Error(`Failed to create shipment: ${shipmentError?.message}`);
    }

    console.log(`Created shipment ${shipment.id}`);

    // 3. Store packages
    const packageInserts = shipment_data.packages.map(pkg => ({
      shipment_id: shipment.id,
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
      weight: pkg.weight,
      description: pkg.description,
      nmfc_code: pkg.nmfc_code,
      freight_class: pkg.freight_class
    }));

    const { error: packagesError } = await supabase
      .from('packages')
      .insert(packageInserts);

    if (packagesError) {
      console.error('Failed to insert packages:', packagesError);
    }

    // 4. Strategic Rate Shopping Engine
    let allQuotes: any[] = [];

    // Strategy 1: Parcel Carriers (for lighter shipments)
    if (totalWeight <= 150 && maxDimension <= 108) {
      console.log('Getting parcel rates...');
      const parcelQuotes = await getParcelRates(shipment_data);
      allQuotes = allQuotes.concat(parcelQuotes.map((q: any) => ({
        ...q,
        quote_type: 'parcel'
      })));
    }

    // Strategy 2: Freight/LTL (for heavy or large shipments)
    if (totalWeight > 70 || maxDimension > 96 || totalPackages > 10) {
      console.log('Getting freight quotes...');
      const freightQuotes = await getFreightRates(shipment_data);
      allQuotes = allQuotes.concat(freightQuotes.map((q: any) => ({
        ...q,
        quote_type: 'freight'
      })));
    }

    // Strategy 3: Hybrid approach for edge cases
    if (totalWeight > 50 && totalWeight <= 100) {
      console.log('Exploring hybrid options...');
      // Could add consolidated shipping options here
    }

    console.log(`Found ${allQuotes.length} total quotes`);

    // 5. Sort quotes by rate (cheapest first)
    allQuotes.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

    // 6. Store quotes in database
    if (allQuotes.length > 0) {
      const quotesInserts = allQuotes.map(quote => ({
        shipment_id: shipment.id,
        carrier: quote.carrier,
        service: quote.service,
        rate: parseFloat(quote.rate),
        estimated_days: quote.estimated_days || null,
        carrier_quote_id: quote.carrier_quote_id,
        quote_type: quote.quote_type,
        details: quote.details || quote
      }));

      const { error: quotesError } = await supabase
        .from('shipment_quotes')
        .insert(quotesInserts);

      if (quotesError) {
        console.error('Failed to insert quotes:', quotesError);
      }
    }

    // 7. Return structured response
    const response = {
      shipment_id: shipment.id,
      total_weight: totalWeight,
      package_count: totalPackages,
      strategy_used: {
        parcel: totalWeight <= 150 && maxDimension <= 108,
        freight: totalWeight > 70 || maxDimension > 96,
        hybrid: totalWeight > 50 && totalWeight <= 100
      },
      quotes: allQuotes.map(quote => ({
        carrier: quote.carrier,
        service: quote.service,
        rate: parseFloat(quote.rate),
        estimated_days: quote.estimated_days,
        quote_type: quote.quote_type,
        savings_vs_individual: quote.savings_vs_individual || null
      })),
      cheapest_option: allQuotes[0] || null,
      total_options: allQuotes.length
    };

    console.log('Rate shopping completed successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Enhanced rate shopping error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});

async function getParcelRates(shipmentData: ShipmentData) {
  const easypostApiKey = Deno.env.get('EASYPOST_API_KEY');
  if (!easypostApiKey) {
    throw new Error('EasyPost API key not configured');
  }

  try {
    // Create EasyPost shipment for multi-package rating
    const easypostPayload = {
      shipment: {
        from_address: {
          street1: shipmentData.from_address.street1,
          street2: shipmentData.from_address.street2 || '',
          city: shipmentData.from_address.city,
          state: shipmentData.from_address.state,
          zip: shipmentData.from_address.zip,
          country: shipmentData.from_address.country || 'US'
        },
        to_address: {
          street1: shipmentData.to_address.street1,
          street2: shipmentData.to_address.street2 || '',
          city: shipmentData.to_address.city,
          state: shipmentData.to_address.state,
          zip: shipmentData.to_address.zip,
          country: shipmentData.to_address.country || 'US'
        },
        // For multi-package, EasyPost expects either parcels array or single parcel
        parcels: shipmentData.packages.map(pkg => ({
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          weight: pkg.weight
        }))
      }
    };

    const response = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${easypostApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(easypostPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EasyPost API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    return (result.rates || []).map((rate: any) => ({
      carrier: rate.carrier,
      service: rate.service,
      rate: rate.rate,
      estimated_days: rate.delivery_days,
      carrier_quote_id: rate.id,
      details: rate
    }));

  } catch (error) {
    console.error('Parcel rate shopping failed:', error);
    return [];
  }
}

async function getFreightRates(shipmentData: ShipmentData) {
  // For now, return mock freight quotes
  // In production, integrate with freight APIs like:
  // - FreightPOP
  // - ShipStation Freight
  // - EasyPost Freight API
  
  console.log('Freight integration not yet implemented - returning mock quotes');
  
  // Mock freight quotes based on total weight and dimensions
  const totalWeight = shipmentData.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
  const mockFreightQuotes = [];

  if (totalWeight > 70) {
    // YRC Freight mock quote
    mockFreightQuotes.push({
      carrier: 'yrc',
      service: 'LTL_STANDARD',
      rate: (totalWeight * 0.85 + 85).toFixed(2), // Mock calculation
      estimated_days: 5,
      carrier_quote_id: `yrc_mock_${Date.now()}`,
      details: { mock: true, basis: 'weight_calculation' }
    });

    // Old Dominion mock quote
    mockFreightQuotes.push({
      carrier: 'old_dominion',
      service: 'LTL_STANDARD',
      rate: (totalWeight * 0.90 + 90).toFixed(2), // Mock calculation
      estimated_days: 4,
      carrier_quote_id: `odfl_mock_${Date.now()}`,
      details: { mock: true, basis: 'weight_calculation' }
    });
  }

  return mockFreightQuotes;
}