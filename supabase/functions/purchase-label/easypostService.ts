
export async function purchaseShippingLabel(shipmentId: string, rateId: string, apiKey: string) {
  const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      rate: { id: rateId }
    }),
  });
  
  const responseText = await response.text();
  let responseData;
  
  try {
    responseData = JSON.parse(responseText);
  } catch (err) {
    responseData = { raw_response: responseText };
  }
  
  if (!response.ok) {
    console.error('EasyPost API error:', responseData);
    
    // Provide more specific error messages
    let errorMessage = 'EasyPost API error';
    if (responseData.error?.message) {
      errorMessage = responseData.error.message;
    } else if (response.status === 422) {
      errorMessage = 'Invalid shipment or rate data. Please check your shipment configuration.';
    } else if (response.status === 401) {
      errorMessage = 'Invalid EasyPost API key. Please check your configuration.';
    } else if (response.status === 404) {
      errorMessage = 'Shipment or rate not found. The shipment may have expired.';
    } else if (response.status === 429) {
      errorMessage = 'API rate limit exceeded. Please wait a few minutes before trying again.';
    } else if (responseText.includes('rate-limited') || responseText.includes('RATE_LIMITED')) {
      errorMessage = 'API rate limit exceeded. Please wait a few minutes before trying again.';
    }
    
    throw new Error(errorMessage);
  }
  
  return responseData;
}
