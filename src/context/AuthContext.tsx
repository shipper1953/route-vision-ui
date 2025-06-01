import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/services/auth";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requireRegistration: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  requireRegistration: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requireRegistration, setRequireRegistration] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    setRequireRegistration(false);
    try {
      const { user } = await auth.login(email, password);
      if (user) {
        // Check if user exists in the users table
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingUser && !fetchError) {
          // User authenticated but not in users table, require registration
          setRequireRegistration(true);
          setUser(null);
          setError("Account found, but not registered. Please register as a new user.");
        } else {
          setUser(user);
          setRequireRegistration(false);
        }
      } else {
        setUser(null);
        setRequireRegistration(false);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      setUser(null);
      setRequireRegistration(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await auth.logout();
      setUser(null);
      setRequireRegistration(false);
    } catch (err: any) {
      setError(err.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        error,
        login,
        logout,
        requireRegistration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);