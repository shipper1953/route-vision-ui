import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EstimateRequest {
  warehouseId: string;
  destinationZip: string;
  items: Array<{
    length: number;
    width: number;
    height: number;
    weight: number;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { warehouseId, destinationZip, items }: EstimateRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get warehouse address
    const { data: warehouse } = await supabase
      .from('warehouses')
      .select('*, companies(id)')
      .eq('id', warehouseId)
      .single();

    if (!warehouse) {
      return new Response(JSON.stringify({ error: 'Warehouse not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get processing times
    const { data: processingTime } = await supabase
      .from('company_processing_times')
      .select('*')
      .eq('company_id', warehouse.companies.id)
      .eq('warehouse_id', warehouseId)
      .single();

    const processingDays = processingTime?.processing_days || 1;
    const cutoffTime = processingTime?.cutoff_time || '14:00:00';

    // Calculate total package dimensions (simplified - would use cartonization in production)
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const largestDim = Math.max(...items.map(i => Math.max(i.length, i.width, i.height)));

    // Get sample rates from EasyPost (simplified test shipment)
    const EASYPOST_API_KEY = Deno.env.get('EASYPOST_API_KEY');
    
    const testShipment = {
      shipment: {
        to_address: {
          zip: destinationZip,
          country: 'US'
        },
        from_address: {
          zip: warehouse.zip,
          country: 'US'
        },
        parcel: {
          length: largestDim,
          width: largestDim,
          height: largestDim,
          weight: totalWeight
        }
      }
    };

    const ratesResponse = await fetch('https://api.easypost.com/v2/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testShipment)
    });

    const ratesData = await ratesResponse.json();
    const rates = ratesData.rates || [];

    // Parse delivery estimates
    const deliveryEstimates = rates.map((rate: any) => ({
      carrier: rate.carrier,
      service: rate.service,
      days: rate.delivery_days || rate.est_delivery_days || 5,
      cost: parseFloat(rate.rate)
    }));

    // Calculate business days
    const today = new Date();
    const currentHour = today.getHours();
    const [cutoffHour] = cutoffTime.split(':').map(Number);
    
    // Add processing days (order after cutoff ships next day)
    let processingOffset = processingDays;
    if (currentHour >= cutoffHour) {
      processingOffset += 1;
    }

    // Find fastest and cheapest options
    const sortedByDays = [...deliveryEstimates].sort((a, b) => a.days - b.days);
    const sortedByCost = [...deliveryEstimates].sort((a, b) => a.cost - b.cost);

    const fastestOption = sortedByDays[0];
    const cheapestOption = sortedByCost[0];

    // Calculate delivery date ranges
    const calculateDeliveryDate = (transitDays: number) => {
      const date = new Date(today);
      let daysAdded = 0;
      let totalDays = processingOffset + transitDays;

      while (daysAdded < totalDays) {
        date.setDate(date.getDate() + 1);
        // Skip weekends
        if (date.getDay() !== 0 && date.getDay() !== 6) {
          daysAdded++;
        }
      }
      return date.toISOString().split('T')[0];
    };

    const earliestDelivery = fastestOption 
      ? calculateDeliveryDate(fastestOption.days)
      : null;
    
    const latestDelivery = deliveryEstimates.length > 0
      ? calculateDeliveryDate(Math.max(...deliveryEstimates.map(e => e.days)))
      : null;

    // Calculate cutoff countdown
    const cutoffDate = new Date(today);
    cutoffDate.setHours(cutoffHour, 0, 0, 0);
    const hoursUntilCutoff = cutoffDate > today 
      ? Math.floor((cutoffDate.getTime() - today.getTime()) / (1000 * 60 * 60))
      : 0;

    const response = {
      earliest_delivery: earliestDelivery,
      latest_delivery: latestDelivery,
      fastest_option: fastestOption,
      cheapest_option: cheapestOption,
      processing_days: processingDays,
      cutoff_time: cutoffTime,
      hours_until_cutoff: hoursUntilCutoff,
      all_options: deliveryEstimates,
      confidence: deliveryEstimates.length > 3 ? 'high' : 'medium'
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delivery estimate error:', error);
    return new Response(JSON.stringify({ error: 'Failed to calculate estimate' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
