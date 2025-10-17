import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrintNodePrinter {
  id: number;
  name: string;
  description: string;
  capabilities: {
    bins: string[];
    dpis: string[];
    extent: number[][];
    papers: string[];
    printrate: {
      rate: number;
      unit: string;
    };
    supports_custom_paper_size: boolean;
  };
  default: boolean;
  state: string;
}

interface PrintJob {
  printerId: number;
  title: string;
  contentType: string;
  content: string; // base64 encoded
  source: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PRINTNODE_API_KEY');
    if (!apiKey) {
      throw new Error('PrintNode API key not configured');
    }

    // Parse request body to get action
    const body = await req.json();
    const action = body.action;

    if (!action) {
      throw new Error('Missing action parameter');
    }

    // Base64 encode the API key for basic auth
    const authHeader = `Basic ${btoa(apiKey)}`;

    if (action === 'list-printers') {
      // Get list of printers
      const response = await fetch('https://api.printnode.com/printers', {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        throw new Error(`PrintNode API error: ${response.statusText}`);
      }

      const printers: PrintNodePrinter[] = await response.json();
      
      return new Response(JSON.stringify({ printers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'print') {
      const { printerId, title, contentType, content, source } = body as PrintJob;

      if (!printerId || !content) {
        throw new Error('Missing required fields: printerId, content');
      }

      // Submit print job
      const printJob = {
        printerId,
        title: title || 'Print Job',
        contentType: contentType || 'pdf_base64',
        content,
        source: source || 'ShipTornado',
      };

      const response = await fetch('https://api.printnode.com/printjobs', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(printJob),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PrintNode print error:', response.status, errorText);
        return new Response(JSON.stringify({ 
          error: `PrintNode rejected the print job: ${response.statusText}`,
          details: errorText,
          status: response.status
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await response.json();
      console.log('Print job submitted:', result);

      return new Response(JSON.stringify({ 
        success: true, 
        jobId: result,
        message: 'Print job submitted successfully' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'print-zpl') {
      const { printerId, title, zplCode } = body;

      if (!printerId || !zplCode) {
        throw new Error('Missing required fields: printerId, zplCode');
      }

      // Submit ZPL print job
      const printJob = {
        printerId,
        title: title || 'ZPL Print Job',
        contentType: 'raw_base64',
        content: btoa(zplCode),
        source: 'ShipTornado',
      };

      const response = await fetch('https://api.printnode.com/printjobs', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(printJob),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PrintNode ZPL print error:', errorText);
        throw new Error(`PrintNode print error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ZPL print job submitted:', result);

      return new Response(JSON.stringify({ 
        success: true, 
        jobId: result,
        message: 'ZPL print job submitted successfully' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use ?action=list-printers, ?action=print, or ?action=print-zpl');

  } catch (error) {
    console.error('PrintNode function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
