
import React, { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import { jwtDecode } from 'jwt-decode';

// Type Definitions
export interface UserType {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  companyId?: string;
}

export interface CompanyType {
  id: string;
  name: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: UserType | null;
  token: string | null;
  company: CompanyType | null;
  login: (formData: LoginFormData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  setToken: Dispatch<SetStateAction<string | null>>;
  setUser: Dispatch<SetStateAction<UserType | null>>;
}

// Helper functions
function isTokenStructurallyValid(token: string | null): boolean {
  return typeof token === 'string' && token.split('.').length === 3;
}

function isTokenStillValid(token: string): boolean {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    return decoded.exp ? decoded.exp * 1000 > Date.now() : true;
  } catch (error) {
    console.error("Error decoding JWT for expiration check:", error);
    return false;
  }
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserType | null>(null);
  const [company, setCompany] = useState<CompanyType | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyTokenAndFetchUser = async () => {
      if (token && isTokenStructurallyValid(token) && isTokenStillValid(token)) {
        try {
          // For now, just mock the user data since we don't have the actual API
          // In a real app, this would make an API call to verify the token and get user data
          setUser({
            id: '1',
            email: 'user@example.com',
            firstName: 'Demo',
            lastName: 'User',
            roles: ['User']
          });
          
          setCompany({
            id: '1',
            name: 'Demo Company'
          });
        } catch (err) {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
          setCompany(null);
        }
      } else if (token) {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setCompany(null);
      }
      setLoading(false);
    };
    
    verifyTokenAndFetchUser();
  }, [token]);

  const login = async (formData: LoginFormData): Promise<void> => {
    setLoading(true);
    try {
      // Mock successful login for now
      // In a real app, this would make an API call to authenticate
      const mockToken = 'mock.jwt.token';
      
      localStorage.setItem("token", mockToken);
      setToken(mockToken);
      
      setUser({
        id: '1',
        email: formData.email,
        firstName: 'Demo',
        lastName: 'User',
        roles: ['User']
      });
      
      setCompany({
        id: '1',
        name: 'Demo Company'
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setCompany(null);
  };
  
  // Fix the isAuthenticated calculation (it was inverted in the original code)
  const isAuthenticated = !!token && !!user && isTokenStructurallyValid(token) && isTokenStillValid(token);

  return (
    <AuthContext.Provider value={{ 
      user, token, company, login, logout, loading, isAuthenticated, setToken, setUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
