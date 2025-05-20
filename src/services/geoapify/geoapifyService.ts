
import { Address } from "@/types/easypost";

/**
 * Service for interacting with Geoapify API for address lookup and autocomplete
 */
export class GeoapifyService {
  private apiKey: string;
  
  /**
   * Creates a new instance of the GeoapifyService
   * @param apiKey The Geoapify API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    console.info('Initializing Geoapify service');
  }

  /**
   * Searches for addresses based on a query string
   * @param query The address search query
   * @returns A promise that resolves to an array of addresses
   */
  async searchAddresses(query: string): Promise<Address[]> {
    try {
      console.log('Searching addresses with Geoapify:', query);
      
      const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
      url.searchParams.append('text', query);
      url.searchParams.append('apiKey', this.apiKey);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '5');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Geoapify search response:', data);
      
      // Transform Geoapify response to our Address format
      return this.transformGeoapifyResults(data.results || []);
    } catch (error) {
      console.error('Error searching addresses with Geoapify:', error);
      throw error;
    }
  }
  
  /**
   * Transforms Geoapify results to our Address format
   * @param results The Geoapify search results
   * @returns An array of addresses in our format
   */
  private transformGeoapifyResults(results: any[]): Address[] {
    return results.map(result => {
      // Extract address components
      const street1 = result.address_line1 || 
                     [result.street, result.housenumber].filter(Boolean).join(' ') || 
                     '';
      const city = result.city || result.county || '';
      const state = result.state || result.state_code || '';
      const zip = result.postcode || '';
      const country = result.country_code?.toUpperCase() || 'US';
      
      return {
        street1,
        street2: result.address_line2 || '',
        city,
        state,
        zip,
        country,
        // Map other properties as needed
        company: '',
        name: '',
        phone: '',
        email: ''
      };
    });
  }

  /**
   * Gets detailed address information
   * @param placeId The Geoapify place ID
   * @returns A promise that resolves to an address
   */
  async getAddressDetails(placeId: string): Promise<Address> {
    try {
      console.log('Getting address details from Geoapify for place ID:', placeId);
      
      const url = new URL('https://api.geoapify.com/v2/place-details');
      url.searchParams.append('id', placeId);
      url.searchParams.append('apiKey', this.apiKey);
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Geoapify address details response:', data);
      
      // Extract address from the response
      const properties = data.features[0]?.properties;
      
      if (!properties) {
        throw new Error('Address details not found');
      }
      
      // Map Geoapify response to our Address format
      return {
        street1: properties.address_line1 || 
                [properties.street, properties.housenumber].filter(Boolean).join(' ') || 
                '',
        street2: properties.address_line2 || '',
        city: properties.city || properties.county || '',
        state: properties.state || properties.state_code || '',
        zip: properties.postcode || '',
        country: properties.country_code?.toUpperCase() || 'US',
        company: '',
        name: '',
        phone: '',
        email: ''
      };
    } catch (error) {
      console.error('Error getting address details from Geoapify:', error);
      throw error;
    }
  }
}

// Export an instance with the provided API key, falling back to environment variable if available
const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || '274bcb0749944615912f9997d5c49105';
const geoapifyService = new GeoapifyService(apiKey);

export default geoapifyService;
