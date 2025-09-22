import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting backfill for company: ${company_id}`);

    // Get all shipments with dimensions but no actual_package_sku
    const { data: shipments, error: shipmentsError } = await supabaseClient
      .from('shipments')
      .select('id, package_dimensions, package_weights')
      .eq('company_id', company_id)
      .is('actual_package_sku', null)
      .not('package_dimensions', 'is', null);

    if (shipmentsError) {
      console.error('Error fetching shipments:', shipmentsError);
      throw shipmentsError;
    }

    console.log(`Found ${shipments?.length || 0} shipments to backfill`);

    // Get company's boxes for matching
    const { data: boxes, error: boxesError } = await supabaseClient
      .from('boxes')
      .select('id, name, sku, length, width, height')
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (boxesError) {
      console.error('Error fetching boxes:', boxesError);
      throw boxesError;
    }

    console.log(`Found ${boxes?.length || 0} company boxes for matching`);

    let updated = 0;
    let skipped = 0;

    for (const shipment of shipments || []) {
      try {
        const dims = shipment.package_dimensions as any;
        if (!dims || !dims.length || !dims.width || !dims.height) {
          skipped++;
          continue;
        }

        // Find the best matching box based on dimensions
        let bestMatch = null;
        let bestScore = Infinity;

        for (const box of boxes || []) {
          // Calculate dimensional difference score
          const lengthDiff = Math.abs(parseFloat(box.length) - parseFloat(dims.length));
          const widthDiff = Math.abs(parseFloat(box.width) - parseFloat(dims.width));
          const heightDiff = Math.abs(parseFloat(box.height) - parseFloat(dims.height));
          
          const score = lengthDiff + widthDiff + heightDiff;
          
          // Only consider boxes that can actually fit the shipment
          if (parseFloat(box.length) >= parseFloat(dims.length) &&
              parseFloat(box.width) >= parseFloat(dims.width) &&
              parseFloat(box.height) >= parseFloat(dims.height) &&
              score < bestScore) {
            bestScore = score;
            bestMatch = box;
          }
        }

        // If no exact fit, find the closest oversized box
        if (!bestMatch) {
          for (const box of boxes || []) {
            const lengthDiff = Math.abs(parseFloat(box.length) - parseFloat(dims.length));
            const widthDiff = Math.abs(parseFloat(box.width) - parseFloat(dims.width));
            const heightDiff = Math.abs(parseFloat(box.height) - parseFloat(dims.height));
            
            const score = lengthDiff + widthDiff + heightDiff;
            if (score < bestScore) {
              bestScore = score;
              bestMatch = box;
            }
          }
        }

        if (bestMatch) {
          // Update shipment with matched box
          const { error: updateError } = await supabaseClient
            .from('shipments')
            .update({
              actual_package_sku: bestMatch.sku || bestMatch.name,
              actual_package_master_id: bestMatch.id
            })
            .eq('id', shipment.id);

          if (updateError) {
            console.error(`Error updating shipment ${shipment.id}:`, updateError);
            skipped++;
          } else {
            updated++;
            console.log(`Updated shipment ${shipment.id} with box ${bestMatch.sku || bestMatch.name}`);
          }
        } else {
          skipped++;
          console.log(`No suitable box found for shipment ${shipment.id} with dimensions`, dims);
        }
      } catch (error) {
        console.error(`Error processing shipment ${shipment.id}:`, error);
        skipped++;
      }
    }

    const result = {
      success: true,
      message: `Backfill completed: ${updated} shipments updated, ${skipped} skipped`,
      updated,
      skipped,
      total: shipments?.length || 0
    };

    console.log('Backfill result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to backfill shipment boxes', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});