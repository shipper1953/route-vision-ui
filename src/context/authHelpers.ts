
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/auth';

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  console.log('Fetching user profile for userId:', userId);
  
  try {
    // Use the security definer function which now fetches roles from user_roles table
    const { data, error } = await supabase
      .rpc('get_user_profile', { user_id: userId });

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn('No profile found for user:', userId);
      return null;
    }

    const profileData = data[0];
    
    console.log('Fetched profile with role from user_roles:', profileData.role);
    
    // Convert warehouse_ids from Json to string[] with proper type casting
    return {
      ...profileData,
      warehouse_ids: Array.isArray(profileData.warehouse_ids) 
        ? (profileData.warehouse_ids as string[])
        : []
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const createUserProfile = async (user: any): Promise<UserProfile | null> => {
  try {
    console.log('Creating user profile for:', user.email);
    
    // Get active Demo company ID
    const { data: demoCompany, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'Demo')
      .eq('is_active', true)
      .single();
      
    if (companyError) {
      console.error('Error finding active Demo company:', companyError);
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
        company_id: demoCompany.id,
        warehouse_ids: demoWarehouse ? [demoWarehouse.id] : []
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    // Assign company_admin role in user_roles table
    await (supabase as any)
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'company_admin'
      });

    console.log('User profile created with company_admin role');
    
    return fetchUserProfile(user.id);
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
