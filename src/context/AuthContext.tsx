
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  signUp: (email: string, password: string, options?: { name: string }) => Promise<void>;
  clearAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const clearAuthState = () => {
    console.log('Clearing auth state...');
    setUser(null);
    setUserProfile(null);
    setLoading(false);
    setError(null);
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
  };

  const createUserProfile = async (user: User) => {
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

  const fetchUserProfile = async (userId: string) => {
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

      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.warn('Exception in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
          clearAuthState();
          return;
        }

        if (session?.user) {
          console.log('Found existing session for:', session.user.email);
          setUser(session.user);
          
          // Try to fetch or create user profile
          const profile = await fetchUserProfile(session.user.id);
          if (!profile) {
            console.log('No profile found, creating one...');
            await createUserProfile(session.user);
          }
        } else {
          console.log('No existing session found');
          clearAuthState();
        }
      } catch (error: any) {
        console.error('Error in auth initialization:', error);
        setError(error.message);
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setError(null);
        // Try to create profile if it doesn't exist
        await createUserProfile(session.user);
        await fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        clearAuthState();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setError(error.message);
        throw error;
      }

      if (data.user) {
        console.log('Login successful for:', data.user.email);
        setUser(data.user);
        await createUserProfile(data.user);
        await fetchUserProfile(data.user.id);
        toast.success('Login successful');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message);
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      console.log('Logging out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        setError(error.message);
        throw error;
      }
      
      clearAuthState();
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout failed:', error);
      setError(error.message);
      toast.error(error.message || 'Logout failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
          },
        },
      });

      if (error) {
        setError(error.message);
        throw error;
      }

      if (data.user) {
        await createUserProfile(data.user);
        toast.success('Account created successfully');
      }
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message || 'Signup failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Alias for signup to match component expectations
  const signUp = async (email: string, password: string, options?: { name: string }) => {
    return signup(email, password, options?.name);
  };

  // Compute isAdmin based on user profile
  const isAdmin = userProfile?.role === 'admin';

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin,
    loading,
    error,
    login,
    logout,
    signup,
    signUp,
    clearAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
