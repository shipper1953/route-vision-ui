// Types for EasyPost SmartRate
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  company?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export interface Parcel {
  length: number;
  width: number;
  height: number;
  weight: number; // in ounces
}

export interface CustomsInfo {
  contents_type: string;
  contents_explanation?: string;
  customs_items?: CustomsItem[];
}

export interface CustomsItem {
  description: string;
  quantity: number;
  value: number;
  weight: number;
  hs_tariff_number?: string;
  origin_country: string;
}

export interface ShipmentRequest {
  from_address: Address;
  to_address: Address;
  parcel: Parcel;
  customs_info?: CustomsInfo;
  options?: Record<string, any>;
}

export interface Rate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  delivery_days: number;
  delivery_date: string | null;
  delivery_accuracy?: string;
  est_delivery_days?: number;
}

export interface SmartRate extends Rate {
  time_in_transit: number;
  delivery_date_guaranteed: boolean;
  delivery_accuracy?: 'percentile_50' | 'percentile_75' | 'percentile_85' | 'percentile_90' | 'percentile_95' | 'percentile_97' | 'percentile_99';
}

export interface ShipmentResponse {
  id: string;
  object: string;
  status: string;
  tracking_code?: string;
  rates: Rate[];
  smartrates?: SmartRate[];
  selected_rate: Rate | null;
}

export interface AddressVerificationResult {
  id: string; 
  address: Address;
  verifications?: {
    delivery: {
      success: boolean;
      errors: string[];
    }
  };
}

class EasyPostService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.easypost.com/v2';
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${btoa(this.apiKey + ':')}`,
      'Content-Type': 'application/json'
    };
  }

  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      // This would normally hit the EasyPost API directly
      // For now, we'll simulate the response for demo purposes
      
      console.log('Creating shipment with data:', shipmentData);
      
      // In a real implementation, this would be:
      /*
      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ shipment: shipmentData })
      });
      
      if (!response.ok) {
        throw new Error(`EasyPost API error: ${response.status}`);
      }
      
      return await response.json();
      */
      
      // Simulated response for frontend development
      return this.getMockShipmentResponse(shipmentData);
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }
  }
  
  // This is a temporary mock function for development
  private getMockShipmentResponse(data: ShipmentRequest): ShipmentResponse {
    const isInternational = data.to_address.country !== 'US';
    const weight = data.parcel.weight;
    
    const baseRates = [
      {
        id: 'rate_123',
        carrier: 'USPS',
        service: 'Priority Mail',
        rate: ((weight * 0.5) + 7.99).toFixed(2),
        delivery_days: 2,
        delivery_date: this.getDeliveryDate(2),
      },
      {
        id: 'rate_124',
        carrier: 'USPS',
        service: 'Express Mail',
        rate: ((weight * 0.7) + 23.99).toFixed(2),
        delivery_days: 1,
        delivery_date: this.getDeliveryDate(1),
      },
      {
        id: 'rate_125',
        carrier: 'UPS',
        service: 'Ground',
        rate: ((weight * 0.6) + 8.99).toFixed(2),
        delivery_days: 3,
        delivery_date: this.getDeliveryDate(3),
      },
      {
        id: 'rate_126',
        carrier: 'UPS',
        service: '2nd Day Air',
        rate: ((weight * 0.8) + 14.99).toFixed(2),
        delivery_days: 2,
        delivery_date: this.getDeliveryDate(2),
      },
      {
        id: 'rate_127',
        carrier: 'FedEx',
        service: 'Ground',
        rate: ((weight * 0.55) + 9.99).toFixed(2),
        delivery_days: 3,
        delivery_date: this.getDeliveryDate(3),
      }
    ];
    
    // Add international options if needed
    if (isInternational) {
      baseRates.push(
        {
          id: 'rate_128',
          carrier: 'DHL',
          service: 'International Express',
          rate: ((weight * 2.2) + 49.99).toFixed(2),
          delivery_days: 4,
          delivery_date: this.getDeliveryDate(4),
        },
        {
          id: 'rate_129',
          carrier: 'FedEx',
          service: 'International Priority',
          rate: ((weight * 2.5) + 59.99).toFixed(2),
          delivery_days: 3,
          delivery_date: this.getDeliveryDate(3),
        }
      );
    }
    
    // Convert to SmartRates
    const smartRates = baseRates.map(rate => ({
      ...rate,
      time_in_transit: rate.delivery_days,
      delivery_date_guaranteed: rate.carrier !== 'USPS',
      delivery_accuracy: this.getRandomDeliveryAccuracy(),
      est_delivery_days: rate.delivery_days
    })) as SmartRate[];
    
    return {
      id: `shp_${Math.random().toString(36).substring(7)}`,
      object: 'Shipment',
      status: 'created',
      rates: baseRates as Rate[],
      smartrates: smartRates,
      selected_rate: null
    };
  }
  
  async verifyAddresses(query: string): Promise<Address[]> {
    try {
      console.log('Looking up addresses with query:', query);
      
      // This would normally hit the EasyPost API directly
      // For now, we'll simulate the response for demo purposes
      
      /*
      In a real implementation, this would be:
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: 'GET',
        headers: this.getHeaders(),
        body: JSON.stringify({ address: { query } })
      });
      
      if (!response.ok) {
        throw new Error(`EasyPost API error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.addresses;
      */
      
      // Return mock addresses for now
      return this.getMockAddressResults(query);
    } catch (error) {
      console.error('Error looking up addresses:', error);
      throw error;
    }
  }
  
  async verifyAddress(address: Address): Promise<AddressVerificationResult> {
    try {
      console.log('Verifying address:', address);
      
      // This would normally hit the EasyPost API directly
      // For now, we'll simulate the response for demo purposes
      
      /*
      In a real implementation, this would be:
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ address })
      });
      
      if (!response.ok) {
        throw new Error(`EasyPost API error: ${response.status}`);
      }
      
      return await response.json();
      */
      
      // Simulate address verification
      return {
        id: `addr_${Math.random().toString(36).substring(7)}`,
        address: {
          ...address,
          // Standardize address components
          street1: address.street1.replace(/\bst\b/i, 'Street').replace(/\bave\b/i, 'Avenue'),
          city: address.city.charAt(0).toUpperCase() + address.city.slice(1).toLowerCase(),
          state: address.state.toUpperCase(),
          zip: this.formatZipCode(address.zip)
        },
        verifications: {
          delivery: {
            success: Math.random() > 0.1, // 90% success rate for demo
            errors: []
          }
        }
      };
    } catch (error) {
      console.error('Error verifying address:', error);
      throw error;
    }
  }
  
  // Format zip code to standard format
  private formatZipCode(zip: string): string {
    // Basic formatting for US zip codes
    if (zip.length === 5 || (zip.length === 10 && zip.charAt(5) === '-')) {
      return zip;
    } else if (zip.length === 9) {
      return `${zip.substring(0, 5)}-${zip.substring(5)}`;
    }
    return zip;
  }
  
  // Mock address lookup function
  private getMockAddressResults(query: string): Address[] {
    // More comprehensive mock data
    const addresses = [
      {
        street1: "123 Main St",
        street2: "Suite 100",
        city: "Boston",
        state: "MA",
        zip: "02108",
        country: "US",
      },
      {
        street1: "123 Main St",
        street2: "Apt 45",
        city: "Cambridge",
        state: "MA",
        zip: "02142",
        country: "US",
      },
      {
        street1: "456 Park Ave",
        street2: "",
        city: "New York",
        state: "NY",
        zip: "10022",
        country: "US",
      },
      {
        street1: "789 Market St",
        street2: "",
        city: "San Francisco",
        state: "CA",
        zip: "94103",
        country: "US",
      },
      {
        street1: "1600 Pennsylvania Ave NW",
        street2: "",
        city: "Washington",
        state: "DC",
        zip: "20500",
        country: "US",
      },
      {
        street1: "350 5th Ave",
        street2: "",
        city: "New York",
        state: "NY",
        zip: "10118",
        country: "US",
      },
    ];

    return addresses.filter((address) => 
      address.street1.toLowerCase().includes(query.toLowerCase()) || 
      address.city.toLowerCase().includes(query.toLowerCase()) || 
      address.state.toLowerCase().includes(query.toLowerCase()) ||
      address.zip.includes(query)
    );
  }
  
  private getDeliveryDate(daysToAdd: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }
  
  private getRandomDeliveryAccuracy(): 'percentile_50' | 'percentile_75' | 'percentile_85' | 'percentile_90' | 'percentile_95' | 'percentile_97' | 'percentile_99' {
    const accuracies = ['percentile_50', 'percentile_75', 'percentile_85', 'percentile_90', 'percentile_95', 'percentile_97', 'percentile_99'];
    return accuracies[Math.floor(Math.random() * accuracies.length)] as any;
  }
}

// Using a placeholder API key - in production this would come from environment variables
const easyPostService = new EasyPostService('EASYPOST_API_KEY_PLACEHOLDER');

export default easyPostService;
