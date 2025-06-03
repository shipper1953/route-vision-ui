
import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContext } from './AuthContext';
import { UserProfile } from '@/types/auth';
import { createUserProfile, fetchUserProfile, clearAuthStorage } from './authHelpers';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const clearAuthState = () => {
    console.log('Clearing auth state...');
    setUser(null);
    setUserProfile(null);
    setError(null);
    clearAuthStorage();
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        setLoading(true);
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setError(error.message);
            clearAuthState();
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('Found existing session for:', session.user.email);
          setUser(session.user);
          
          // Try to fetch user profile in background
          setTimeout(async () => {
            if (mounted) {
              try {
                const profile = await fetchUserProfile(session.user.id);
                console.log('Fetched user profile:', profile);
                if (mounted) {
                  setUserProfile(profile);
                }
              } catch (error) {
                console.error('Error fetching user profile:', error);
              }
            }
          }, 0);
        } else if (mounted) {
          console.log('No existing session found');
          clearAuthState();
        }
      } catch (error: any) {
        console.error('Error in auth initialization:', error);
        if (mounted) {
          setError(error.message);
          clearAuthState();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setError(null);
        
        // Defer profile operations to avoid blocking auth flow
        setTimeout(async () => {
          if (mounted) {
            try {
              const profile = await fetchUserProfile(session.user.id);
              console.log('Auth state change - fetched profile:', profile);
              if (mounted) {
                setUserProfile(profile);
              }
            } catch (error) {
              console.error('Error handling user profile:', error);
            }
          }
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        clearAuthState();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
        // Don't set user state here - let the auth state change handler do it
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
      
      // clearAuthState will be called by the auth state change handler
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
      console.log('Creating account for:', email, 'with name:', name);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('Signup error:', error);
        setError(error.message);
        throw error;
      }

      if (data.user) {
        console.log('Account created successfully for:', data.user.email);
        
        // The database trigger will automatically:
        // 1. Create user profile in users table
        // 2. Assign to Demo company
        // 3. Set role as company_admin
        
        // Send welcome email via edge function
        try {
          const response = await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: data.user.email,
              name: name || email.split('@')[0],
            },
          });
          
          if (response.error) {
            console.warn('Failed to send welcome email:', response.error);
          }
        } catch (emailError) {
          console.warn('Failed to send welcome email:', emailError);
          // Don't fail the signup process if email fails
        }
        
        toast.success('Account created successfully! You can now log in.');
      }
    } catch (error: any) {
      console.error('Signup failed:', error);
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

  // Compute isAdmin based on user profile - updated to match new role system
  const isAdmin = userProfile?.role === 'company_admin' || userProfile?.role === 'super_admin';
  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isCompanyAdmin = userProfile?.role === 'company_admin';

  // Add debug logging for role computations
  useEffect(() => {
    console.log('Role computations:', {
      userProfile: userProfile ? {
        role: userProfile.role,
        email: userProfile.email
      } : null,
      isAdmin,
      isSuperAdmin,
      isCompanyAdmin
    });
  }, [userProfile, isAdmin, isSuperAdmin, isCompanyAdmin]);

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin,
    isSuperAdmin,
    isCompanyAdmin,
    userProfile,
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
