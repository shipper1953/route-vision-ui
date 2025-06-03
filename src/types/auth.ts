
import { User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  signUp: (email: string, password: string, options?: { name: string }) => Promise<void>;
  clearAuthState: () => void;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'company_admin' | 'super_admin';
  company_id?: string;
  warehouse_ids?: string[];
}

export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: any;
  settings?: any;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface Warehouse {
  id: string;
  company_id: string;
  name: string;
  address: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  company_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  company_id: string;
  amount: number;
  type: 'credit' | 'debit' | 'refund';
  description?: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
  created_by?: string;
}
