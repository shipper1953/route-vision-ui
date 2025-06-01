
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/auth';

export const createUserProfile = async (user: User): Promise<void> => {
  try {
    console.log('Creating user profile for:', user.email);
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      console.log('User profile already exists');
      return;
    }

    // Create new profile with required password field (empty since auth is handled by Supabase)
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        password: '', // Required field but managed by Supabase auth
        role: 'user'
      });

    if (insertError) {
      console.error('Error creating user profile:', insertError);
      // Don't throw error, just log it - profile creation shouldn't block login
    } else {
      console.log('User profile created successfully');
    }
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    // Don't throw error - profile creation shouldn't block login
  }
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching user profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.warn('Exception in fetchUserProfile:', error);
    return null;
  }
};

export const clearAuthStorage = (): void => {
  console.log('Clearing auth storage...');
  localStorage.clear();
  sessionStorage.clear();
};
