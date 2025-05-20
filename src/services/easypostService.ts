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
  private useMock: boolean = true;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.easypost.com/v2';
    
    // If we have a real API key that's not the placeholder, use the real service
    this.useMock = apiKey === 'EASYPOST_API_KEY_PLACEHOLDER';
    
    if (!this.useMock) {
      console.log('Using live EasyPost API');
    } else {
      console.log('Using mock EasyPost service');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${btoa(this.apiKey + ':')}`,
      'Content-Type': 'application/json'
    };
  }

  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      // Use real API if not in mock mode
      if (!this.useMock) {
        const response = await fetch(`${this.baseUrl}/shipments`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ shipment: shipmentData })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`EasyPost API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        return await response.json();
      }
      
      // Otherwise use mock data
      console.log('Creating shipment with mock data:', shipmentData);
      return this.getMockShipmentResponse(shipmentData);
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    }
  }
  
  async verifyAddresses(query: string): Promise<Address[]> {
    try {
      console.log('Looking up addresses with query:', query);
      
      // Use real API if not in mock mode
      if (!this.useMock) {
        // EasyPost doesn't have a direct address lookup by text query
        // We'd typically use a different service here like Google Places API
        // But for demonstration, we'll use a fuzzy address verification approach
        
        // Create a dummy address with the query
        const dummyAddress = {
          street1: query,
          city: '',
          state: '',
          zip: '',
          country: 'US'
        };
        
        // Try to verify it to get suggestions
        const response = await fetch(`${this.baseUrl}/addresses`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ address: dummyAddress })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`EasyPost API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const result = await response.json();
        
        // Return the verified address as a result (may only be one)
        return [result.address];
      }
      
      // Otherwise use mock data
      return this.getMockAddressResults(query);
    } catch (error) {
      console.error('Error looking up addresses:', error);
      throw error;
    }
  }
  
  async verifyAddress(address: Address): Promise<AddressVerificationResult> {
    try {
      console.log('Verifying address:', address);
      
      // Use real API if not in mock mode
      if (!this.useMock) {
        const response = await fetch(`${this.baseUrl}/addresses`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ 
            address,
            verify: ['delivery'] 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`EasyPost API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        return await response.json();
      }
      
      // Otherwise use mock verification
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

// Get API key from Supabase environment variable
const apiKey = import.meta.env.VITE_EASYPOST_API_KEY || 'EASYPOST_API_KEY_PLACEHOLDER';
const easyPostService = new EasyPostService(apiKey);

export default easyPostService;
