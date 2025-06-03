
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/auth';

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  console.log('Fetching user profile for userId:', userId);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('No profile found for user:', userId);
        
        // Try to create a profile for this user if they don't have one
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          console.log('Attempting to create profile for existing user');
          await createUserProfile(user);
          
          // Try to fetch the profile again
          const { data: newData, error: newError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
          if (newError) {
            console.error('Failed to fetch newly created profile:', newError);
            return null;
          }
          
          // Convert warehouse_ids from Json to string[]
          return {
            ...newData,
            warehouse_ids: Array.isArray(newData.warehouse_ids) ? newData.warehouse_ids : []
          };
        }
        return null;
      }
      throw error;
    }

    // Convert warehouse_ids from Json to string[]
    return {
      ...data,
      warehouse_ids: Array.isArray(data.warehouse_ids) ? data.warehouse_ids : []
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const createUserProfile = async (user: any): Promise<UserProfile | null> => {
  try {
    console.log('Creating user profile for:', user.email);
    
    // Get Demo company ID
    const { data: demoCompany, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'Demo')
      .single();
      
    if (companyError) {
      console.error('Error finding Demo company:', companyError);
      return null;
    }
    
    // Get Demo warehouse ID
    const { data: demoWarehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('id')
      .eq('company_id', demoCompany.id)
      .eq('is_default', true)
      .single();
      
    if (warehouseError) {
      console.warn('No default warehouse found for Demo company');
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email,
        password: '',
        role: 'company_admin',
        company_id: demoCompany.id,
        warehouse_ids: demoWarehouse ? [demoWarehouse.id] : []
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    console.log('User profile created successfully:', data);
    
    // Convert warehouse_ids from Json to string[]
    return {
      ...data,
      warehouse_ids: Array.isArray(data.warehouse_ids) ? data.warehouse_ids : []
    };
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    return null;
  }
};

export const clearAuthStorage = () => {
  try {
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.removeItem('supabase.auth.token');
  } catch (error) {
    console.warn('Error clearing auth storage:', error);
  }
};
