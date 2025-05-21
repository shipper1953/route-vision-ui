
import { Address } from "@/types/easypost";

/**
 * Service for interacting with Geoapify API for address lookup and autocomplete
 */
export class GeoapifyService {
  private apiKey: string;
  
  /**
   * Creates a new instance of the GeoapifyService
   */
  constructor() {
    // Get the API key from environment variables
    this.apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || "274bcb0749944615912f9997d5c49105";
    console.log('Initializing Geoapify service with API key');
  }

  /**
   * Searches for addresses based on a query string
   * @param query The address search query
   * @returns A promise that resolves to an array of addresses
   */
  async searchAddresses(query: string): Promise<Address[]> {
    try {
      console.log('Searching addresses with query:', query);
      
      if (!query || query.length < 3) {
        console.log('Query too short, skipping search');
        return [];
      }
      
      // Call the Geoapify API directly
      const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
      url.searchParams.append('text', query);
      url.searchParams.append('apiKey', this.apiKey);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '5');
      url.searchParams.append('type', 'street');
      
      console.log('Calling Geoapify API directly');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Geoapify API error: ${response.status}`, errorText);
        throw new Error(`Geoapify API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Geoapify API response received:', data);
      
      // Transform Geoapify response to our Address format
      if (!data?.results || !Array.isArray(data.results) || data.results.length === 0) {
        console.log('No results returned from address lookup');
        return [];
      }
      
      return this.transformGeoapifyResults(data.results);
    } catch (error: any) {
      console.error('Error searching addresses:', error);
      
      // Return empty array on specific types of errors for graceful degradation
      if (error.message && 
         (error.message.includes('400') || // bad request, likely invalid query format
          error.message.includes('429'))) { // rate limiting
        console.log('Recoverable error - returning empty results:', error.message);
        return [];
      }
      
      // For other errors, still throw so we can show appropriate error messages
      throw error;
    }
  }
  
  /**
   * Transforms Geoapify results to our Address format
   * @param features The Geoapify search results
   * @returns An array of addresses in our format
   */
  private transformGeoapifyResults(results: any[]): Address[] {
    return results.map(result => {
      console.log('Transforming Geoapify result:', result);
      
      if (!result) {
        return {
          street1: '',
          city: '',
          state: '',
          zip: '',
          country: 'US',
        };
      }
      
      const properties = result.properties || {};
      
      // Extract address components from the Geoapify response format
      const street1 = properties.address_line1 || 
        `${properties.housenumber || ''} ${properties.street || ''}`.trim();
      const street2 = properties.address_line2 || '';
      const city = properties.city || properties.county || '';
      const state = properties.state || properties.state_code || '';
      const zip = properties.postcode || properties.zip || '';
      const country = properties.country_code?.toUpperCase() || 'US';
      
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
      };
    });
  }
}

// Create and export a singleton instance
const geoapifyService = new GeoapifyService();

export default geoapifyService;
