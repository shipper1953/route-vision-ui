
import { Address, AddressVerificationResult, ShipmentRequest, ShipmentResponse } from "@/types/easypost";

export class MockEasyPostService {
  // Mock address lookup function
  getMockAddressResults(query: string): Address[] {
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
  
  // Format zip code to standard format
  formatZipCode(zip: string): string {
    // Basic formatting for US zip codes
    if (zip.length === 5 || (zip.length === 10 && zip.charAt(5) === '-')) {
      return zip;
    } else if (zip.length === 9) {
      return `${zip.substring(0, 5)}-${zip.substring(5)}`;
    }
    return zip;
  }
  
  getMockShipmentResponse(shipmentData: ShipmentRequest): ShipmentResponse {
    // Generate a mock shipment response with rates
    const mockRates = [
      {
        id: `rate_${Math.random().toString(36).substring(7)}`,
        carrier: "USPS",
        service: "Priority",
        rate: "7.95",
        delivery_days: 2,
        delivery_date: this.getDeliveryDate(2),
        time_in_transit: 2,
        delivery_date_guaranteed: false,
        delivery_accuracy: this.getRandomDeliveryAccuracy(),
      },
      {
        id: `rate_${Math.random().toString(36).substring(7)}`,
        carrier: "USPS",
        service: "Express",
        rate: "23.50",
        delivery_days: 1,
        delivery_date: this.getDeliveryDate(1),
        time_in_transit: 1,
        delivery_date_guaranteed: true,
        delivery_accuracy: this.getRandomDeliveryAccuracy(),
      },
      {
        id: `rate_${Math.random().toString(36).substring(7)}`,
        carrier: "UPS",
        service: "Ground",
        rate: "9.75",
        delivery_days: 3,
        delivery_date: this.getDeliveryDate(3),
        time_in_transit: 3,
        delivery_date_guaranteed: false,
        delivery_accuracy: this.getRandomDeliveryAccuracy(),
      },
      {
        id: `rate_${Math.random().toString(36).substring(7)}`,
        carrier: "UPS",
        service: "2-Day Air",
        rate: "17.25",
        delivery_days: 2,
        delivery_date: this.getDeliveryDate(2),
        time_in_transit: 2,
        delivery_date_guaranteed: true,
        delivery_accuracy: this.getRandomDeliveryAccuracy(),
      },
      {
        id: `rate_${Math.random().toString(36).substring(7)}`,
        carrier: "FedEx",
        service: "Ground",
        rate: "10.55",
        delivery_days: 3,
        delivery_date: this.getDeliveryDate(3),
        time_in_transit: 3,
        delivery_date_guaranteed: false,
        delivery_accuracy: this.getRandomDeliveryAccuracy(),
      }
    ];
    
    return {
      id: `shp_${Math.random().toString(36).substring(7)}`,
      object: "Shipment",
      status: "created",
      rates: mockRates,
      smartrates: mockRates as any,
      selected_rate: null
    };
  }
  
  getDeliveryDate(daysToAdd: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  }
  
  getRandomDeliveryAccuracy(): 'percentile_50' | 'percentile_75' | 'percentile_85' | 'percentile_90' | 'percentile_95' | 'percentile_97' | 'percentile_99' {
    const accuracies = ['percentile_50', 'percentile_75', 'percentile_85', 'percentile_90', 'percentile_95', 'percentile_97', 'percentile_99'];
    return accuracies[Math.floor(Math.random() * accuracies.length)] as any;
  }

  async verifyAddresses(query: string): Promise<Address[]> {
    console.log('Looking up addresses with mock data and query:', query);
    return this.getMockAddressResults(query);
  }
  
  async verifyAddress(address: Address): Promise<AddressVerificationResult> {
    console.log('Verifying address with mock data:', address);
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
  }

  async createShipment(shipmentData: ShipmentRequest): Promise<ShipmentResponse> {
    console.log('Creating shipment with mock data:', shipmentData);
    return this.getMockShipmentResponse(shipmentData);
  }
}
