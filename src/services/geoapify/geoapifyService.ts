
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
      url.searchParams.append('format', 'geojson'); // Requesting GeoJSON format
      url.searchParams.append('limit', '5');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Geoapify API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Geoapify search response type:', typeof data);
      console.log('Geoapify search response has features:', data.features && Array.isArray(data.features));
      
      // Transform Geoapify GeoJSON response to our Address format
      if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
        console.log('No results returned from Geoapify');
        return [];
      }
      
      return this.transformGeoapifyGeoJsonResults(data.features);
    } catch (error) {
      console.error('Error searching addresses with Geoapify:', error);
      return [];
    }
  }
  
  /**
   * Transforms Geoapify GeoJSON feature results to our Address format
   * @param features The Geoapify GeoJSON features
   * @returns An array of addresses in our format
   */
  private transformGeoapifyGeoJsonResults(features: any[]): Address[] {
    return features.map(feature => {
      const props = feature.properties;
      console.log('Transforming Geoapify feature:', props);
      
      // Extract address components from GeoJSON properties
      const street1 = props.address_line1 || '';
      const city = props.city || props.county || '';
      const state = props.state || props.state_code || '';
      const zip = props.postcode || '';
      const country = props.country_code?.toUpperCase() || 'US';
      
      // Create a formatted address string for display if not provided
      const formattedAddress = props.formatted || 
        `${street1}, ${city}, ${state} ${zip}, ${props.country || ''}`;
      
      console.log('Extracted address:', { street1, city, state, zip, country, formattedAddress });
      
      return {
        street1,
        street2: props.address_line2 || '',
        city,
        state,
        zip,
        country,
        // Map other properties as needed
        company: '',
        name: '',
        phone: '',
        email: '',
        // Adding a place_id for potential detailed lookup later
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
