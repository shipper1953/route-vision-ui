
export interface NewUserForm {
  email: string;
  name: string;
  role: 'user' | 'company_admin' | 'super_admin';
  company_id: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'company_admin' | 'super_admin';
  company_id: string | null;
  warehouse_ids: any;
}

export interface DatabaseCompany {
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
