
export const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCorsPreflightRequest(): Response {
  return new Response(null, { headers: corsHeaders, status: 204 });
}

export function createErrorResponse(error: string, details?: any, status: number = 500): Response {
  return new Response(JSON.stringify({ error, details }), {
    headers: corsHeaders,
    status,
  });
}

export function createSuccessResponse(data: any): Response {
  return new Response(JSON.stringify(data), { headers: corsHeaders });
}
