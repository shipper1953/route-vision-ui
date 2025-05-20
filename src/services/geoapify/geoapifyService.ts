
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
    console.info('Initializing Geoapify service with API key:', apiKey ? 'API key provided' : 'No API key provided');
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
      if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
        console.log('No results returned from Geoapify');
        return [];
      }
      
      return this.transformGeoapifyResults(data.features);
    } catch (error) {
      console.error('Error searching addresses with Geoapify:', error);
      return [];
    }
  }
  
  /**
   * Transforms Geoapify results to our Address format
   * @param results The Geoapify search results
   * @returns An array of addresses in our format
   */
  private transformGeoapifyResults(features: any[]): Address[] {
    return features.map(feature => {
      const props = feature.properties;
      console.log('Transforming Geoapify result:', props);
      
      if (!props) {
        return {
          street1: '',
          city: '',
          state: '',
          zip: '',
          country: 'US',
        };
      }
      
      // Extract address components from the Geoapify response format
      const street1 = props.address_line1 || '';
      const street2 = props.address_line2 || '';
      const city = props.city || props.county || '';
      const state = props.state || props.state_code || '';
      const zip = props.postcode || '';
      const country = props.country_code?.toUpperCase() || 'US';
      
      return {
        street1,
        street2,
        city,
        state,
        zip,
        country,
        company: '',
        name: '',
        phone: '',
        email: '',
        // Store place_id for potential use in getAddressDetails
        place_id: props.place_id || ''
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
      const properties = data.features?.[0]?.properties;
      
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

// Export an instance with the provided API key, checking both naming conventions
const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || 
               import.meta.env.GEOAPIFY_API_KEY || 
               '274bcb0749944615912f9997d5c49105'; // Use the API key from your screenshot

console.log('Initializing Geoapify service with API key:', apiKey ? 'Key available' : 'No key available');
const geoapifyService = new GeoapifyService(apiKey);

export default geoapifyService;
