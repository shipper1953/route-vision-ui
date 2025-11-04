import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1?dts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "frame-ancestors 'self' https://*.lovable.dev https://*.supabase.co; object-src 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const labelUrl = url.searchParams.get('url');
    
    if (!labelUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate that the URL is from a trusted source (EasyPost or Shippo)
    const allowedHosts = [
      'easypost-files.s3.us-west-2.amazonaws.com',
      'easypost-files.s3-us-west-2.amazonaws.com',
      'shippo-delivery-east.s3.amazonaws.com',
      'shippo-delivery-west.s3.amazonaws.com',
      'goshippo-production.s3.amazonaws.com',
      'deliver.goshippo.com'
    ];

    const urlObj = new URL(labelUrl);
    if (!allowedHosts.includes(urlObj.hostname)) {
      return new Response(
        JSON.stringify({ error: 'Invalid label URL source' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Proxying label request for: ${labelUrl}`);

    // Fetch the PDF from the external source
    const response = await fetch(labelUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch label: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch label: ${response.statusText}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the label content
    const labelContent = await response.arrayBuffer();

    // Determine content type from response
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const isPng = contentType.includes('png');
    const isJpeg = contentType.includes('jpeg') || contentType.includes('jpg');
    const isImage = contentType.includes('image') || isPng || isJpeg;

    console.log('Label content type:', contentType, 'isImage:', isImage);

    // Convert images to PDF for better printer compatibility
    if (isImage) {
      try {
        console.log('Converting image to PDF for proper sizing');
        const pdfDoc = await PDFDocument.create();
        const imageBytes = new Uint8Array(labelContent);

        let embeddedImage;
        if (isPng) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }

        const { width, height } = embeddedImage;
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width,
          height,
        });

        const pdfBytes = await pdfDoc.save();

        return new Response(pdfBytes, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="shipping-label.pdf"',
            'Cache-Control': 'public, max-age=3600',
            'Cross-Origin-Embedder-Policy': 'unsafe-none',
            'Cross-Origin-Opener-Policy': 'unsafe-none'
          },
        });
      } catch (error) {
        console.error('Failed to convert image label to PDF, returning original:', error);
        // Fall through to return original content
      }
    }

    // Return the label with proper headers for iframe embedding
    return new Response(labelContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': 'inline; filename="shipping-label.pdf"',
        'Cache-Control': 'public, max-age=3600',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        'Cross-Origin-Opener-Policy': 'unsafe-none'
      },
    });

  } catch (error) {
    console.error('Error in label-proxy:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});