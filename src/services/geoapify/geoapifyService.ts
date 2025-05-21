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
      
      console.log('Address lookup response received');
      
      // Transform Geoapify response to our Address format
      if (!data.features || !Array.isArray(data.features) || data.features.length === 0) {
        console.log('No results returned from address lookup');
        return [];
      }
      
      return this.transformGeoapifyResults(data.features);
    } catch (error) {
      console.error('Error searching addresses:', error);
      return [];
    }
  }
  
  /**
   * Transforms Geoapify results to our Address format
   * @param features The Geoapify search results
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
   * Gets detailed address information - Not used in current implementation
   * @param placeId The Geoapify place ID
   * @returns A promise that resolves to an address
   */
  async getAddressDetails(placeId: string): Promise<Address> {
    try {
      console.log('Getting address details for place ID:', placeId);
      
      const url = new URL('https://api.geoapify.com/v2/place-details');
      url.searchParams.append('id', placeId);
      
      // This would need to be updated to use the edge function as well
      // For now, we'll return a placeholder as this method is not currently used
      
      return {
        street1: '',
        street2: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
        company: '',
        name: '',
        phone: '',
        email: ''
      };
    } catch (error) {
      console.error('Error getting address details:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const geoapifyService = new GeoapifyService();

export default geoapifyService;
