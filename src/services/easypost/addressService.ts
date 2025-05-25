
import { Address, AddressVerificationResult } from "@/types/easypost";
import { supabase } from "@/integrations/supabase/client";

export class AddressService {
  private apiKey: string;
  private baseUrl = "https://api.easypost.com/v2";
  private useEdgeFunctions: boolean;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.useEdgeFunctions = !apiKey;
  }

  async verifyAddress(address: Address): Promise<AddressVerificationResult> {
    try {
      console.log('Verifying address with EasyPost:', address);
      
      if (this.useEdgeFunctions) {
        const { data, error } = await supabase.functions.invoke('address-lookup', {
          body: { address }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return data;
      }
      
      const response = await fetch(`${this.baseUrl}/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          address: {
            street1: address.street1,
            street2: address.street2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country,
            company: address.company,
            name: address.name,
            phone: address.phone,
            email: address.email
          },
          verify: ['delivery']
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('EasyPost API error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to verify address');
      }
      
      const result = await response.json();
      return {
        id: result.id,
        address: {
          street1: result.street1,
          street2: result.street2,
          city: result.city,
          state: result.state,
          zip: result.zip,
          country: result.country,
          company: result.company,
          name: result.name,
          phone: result.phone,
          email: result.email
        },
        verifications: result.verifications
      };
    } catch (error) {
      console.error('Error verifying address:', error);
      throw error;
    }
  }
}
