
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider initializing...');
    // Check for existing authentication state
    const authState = localStorage.getItem('isAuthenticated');
    if (authState === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
    console.log('AuthProvider initialized - authenticated:', authState === 'true');
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Login attempt:', email);
    setLoading(true);
    setError(null);
    
    try {
      // Simple auth check for demo
      if (email === 'admin@example.com' && password === 'password') {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
      } else if (email === 'user@example.com' && password === 'password') {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('Logout');
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, error, login, logout }}>
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
