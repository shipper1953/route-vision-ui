
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  userProfile: any;
  isAdmin: boolean;
  hasRole: (role: string) => boolean;
  clearAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const clearAuthState = () => {
    console.log('Clearing auth state');
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setError(null);
    // Clear any stored auth data
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
  };

  useEffect(() => {
    console.log('AuthProvider initializing...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle sign out event specifically
        if (event === 'SIGNED_OUT') {
          clearAuthState();
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user profile when user logs in
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              console.log('Fetching user profile for:', session.user.id);
              const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (profileError) {
                console.warn('Error fetching user profile:', profileError);
                // Don't fail login if profile fetch fails, just log warning
                setUserProfile(null);
              } else if (profile) {
                console.log('User profile fetched:', profile);
                setUserProfile(profile);
              } else {
                console.log('No profile found for user, creating basic profile entry');
                // Create a basic profile entry if none exists
                const { data: newProfile, error: insertError } = await supabase
                  .from('users')
                  .insert({
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.email?.split('@')[0] || 'User',
                    role: 'user'
                  })
                  .select()
                  .single();
                
                if (insertError) {
                  console.warn('Could not create user profile:', insertError);
                  setUserProfile(null);
                } else {
                  console.log('Created new user profile:', newProfile);
                  setUserProfile(newProfile);
                }
              }
            } catch (err) {
              console.warn('Could not fetch user profile:', err);
              setUserProfile(null);
            }
          }, 0);
        } else if (!session?.user) {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Login attempt:', email);
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      console.log('Login successful:', data.user?.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      console.error('Login error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    console.log('Signup attempt:', email);
    setLoading(true);
    setError(null);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      console.log('Signup successful:', data.user?.email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      console.error('Signup error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('Logout');
    setError(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
      // Clear state immediately
      clearAuthState();
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
      // Still clear state even if logout fails
      clearAuthState();
    }
  };

  const isAuthenticated = !!session && !!user;
  const isAdmin = userProfile?.role === 'admin';
  const hasRole = (role: string) => userProfile?.role === role;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isAuthenticated, 
      loading, 
      error, 
      login, 
      logout,
      signUp,
      userProfile,
      isAdmin,
      hasRole,
      clearAuthState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
