
async function ensurePhoneNumbers(shipmentId: string, apiKey: string) {
  console.log('Checking and fixing phone numbers for shipment:', shipmentId);
  
  // Get the current shipment details
  const getResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!getResponse.ok) {
    console.log('Failed to get shipment details, proceeding with purchase anyway');
    return; // Don't fail the whole operation if we can't get details
  }
  
  const shipment = await getResponse.json();
  
  // Check if phone numbers are missing or empty
  const fromNeedsPhone = !shipment.from_address?.phone || shipment.from_address.phone.trim() === '';
  const toNeedsPhone = !shipment.to_address?.phone || shipment.to_address.phone.trim() === '';
  
  if (fromNeedsPhone || toNeedsPhone) {
    console.log('Phone numbers missing, updating shipment addresses');
    
    // Update the shipment with proper phone numbers
    const updateData: any = {};
    
    if (fromNeedsPhone) {
      updateData.from_address = {
        ...shipment.from_address,
        phone: "5555555555"
      };
    }
    
    if (toNeedsPhone) {
      updateData.to_address = {
        ...shipment.to_address,
        phone: "5555555555"
      };
    }
    
    const updateResponse = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shipment: updateData }),
    });
    
    if (updateResponse.ok) {
      console.log('✅ Successfully updated shipment with phone numbers');
    } else {
      console.log('⚠️ Failed to update shipment with phone numbers, but continuing...');
    }
  } else {
    console.log('✅ Phone numbers already present');
  }
}

export async function purchaseShippingLabel(shipmentId: string, rateId: string, apiKey: string) {
  // First, ensure phone numbers are present
  await ensurePhoneNumbers(shipmentId, apiKey);
  
  console.log('Purchasing label for shipment:', shipmentId, 'with rate:', rateId);
  
  // Request ZPL format for thermal printer compatibility
  // EasyPost will provide PNG as fallback if ZPL is not supported by the carrier
  const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      rate: { id: rateId },
      label_format: 'ZPL' // Request ZPL format for thermal printers
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
  
  // After successful purchase, check for ZPL URL and fetch if available
  if (responseData.postage_label?.label_zpl_url) {
    console.log('📋 Found label_zpl_url, fetching ZPL content...');
    try {
      const zplResponse = await fetch(responseData.postage_label.label_zpl_url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (zplResponse.ok) {
        const zplContent = await zplResponse.text();
        if (zplContent.trim().startsWith('^XA')) {
          console.log('✅ Successfully fetched ZPL from postage_label.label_zpl_url');
          responseData.label_zpl = zplContent;
        }
      }
    } catch (zplError) {
      console.warn('⚠️ Failed to fetch ZPL from label_zpl_url:', zplError);
    }
  }
  
  return responseData;
}

// Try to get ZPL format label if supported by carrier
export async function tryGetZplLabel(shipmentId: string, apiKey: string): Promise<string | null> {
  try {
    console.log('🏷️  Attempting to retrieve ZPL format for shipment:', shipmentId);
    
    // Convert the label to ZPL format
    const response = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/label`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/zpl', // Request ZPL format
      },
    });
    
    if (!response.ok) {
      console.warn('⚠️  ZPL format not available for this carrier:', response.status);
      return null;
    }
    
    const zplContent = await response.text();
    
    // Verify it's actually ZPL (should start with ^XA)
    if (zplContent.trim().startsWith('^XA')) {
      console.log('✅ Successfully retrieved ZPL format (length:', zplContent.length, ')');
      return zplContent;
    } else {
      console.warn('⚠️  Response is not valid ZPL format');
      return null;
    }
  } catch (error) {
    console.error('❌ Error retrieving ZPL format:', error);
    return null;
  }
}
