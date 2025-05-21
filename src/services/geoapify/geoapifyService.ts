
import { Address } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

/**
 * Service for interacting with Geoapify API for address lookup and autocomplete
 * Uses a Supabase Edge Function to securely handle API keys
 */
export class GeoapifyService {
  /**
   * Creates a new instance of the GeoapifyService
   */
  constructor() {
    console.log('Initializing Geoapify service through Supabase Edge Function');
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
      
      // Call our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('address-lookup', {
        body: { query }
      });
      
      if (error) {
        console.error('Error calling address-lookup function:', error);
        throw new Error(`Address lookup failed: ${error.message}`);
      }
      
      console.log('Address lookup response received:', data);
      
      // Transform Geoapify response to our Address format
      if (!data?.results || !Array.isArray(data.results) || data.results.length === 0) {
        console.log('No results returned from address lookup');
        return [];
      }
      
      return this.transformGeoapifyResults(data.results);
    } catch (error) {
      console.error('Error searching addresses:', error);
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
      
      // Extract address components from the Geoapify response format
      const street1 = result.address_line1 || '';
      const street2 = result.address_line2 || '';
      const city = result.city || result.county || '';
      const state = result.state || result.state_code || '';
      const zip = result.postcode || result.zip || '';
      const country = result.country_code?.toUpperCase() || 'US';
      
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
