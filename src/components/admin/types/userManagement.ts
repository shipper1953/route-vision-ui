
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
  email: string | null;
  phone: string | null;
  address: any;
  settings: any;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface NewUserForm {
  email: string;
  name: string;
  role: 'user' | 'company_admin' | 'super_admin';
  company_id: string;
}
