
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserProfile, Company } from "@/types/auth";
import { DatabaseUser, DatabaseCompany } from "../types/userManagement";

export const useUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from database...');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true }); // Changed from created_at to name

      console.log('Users query result:', { data, error });

      if (error) throw error;
      
      // Transform database users to UserProfile format
      const transformedUsers: UserProfile[] = (data as DatabaseUser[])?.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.company_id || undefined,
        warehouse_ids: Array.isArray(user.warehouse_ids) 
          ? user.warehouse_ids 
          : typeof user.warehouse_ids === 'string' 
            ? JSON.parse(user.warehouse_ids)
            : []
      })) || [];
      
      console.log('Transformed users:', transformedUsers);
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      console.log('Fetching companies from database...');
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      console.log('Companies query result:', { data, error });

      if (error) throw error;
      
      // Transform database companies to Company format
      const transformedCompanies: Company[] = (data as DatabaseCompany[])?.map(company => ({
        id: company.id,
        name: company.name,
        email: company.email || undefined,
        phone: company.phone || undefined,
        address: company.address || undefined,
        settings: company.settings,
        created_at: company.created_at,
        updated_at: company.updated_at,
        is_active: company.is_active
      })) || [];
      
      console.log('Transformed companies:', transformedCompanies);
      setCompanies(transformedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch companies');
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'company_admin' | 'super_admin') => {
    try {
      console.log('Updating user role:', { userId, newRole });
      
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const removeUserFromCompany = async (userId: string) => {
    try {
      console.log('Removing user from company:', { userId });
      
      const { error } = await supabase
        .from('users')
        .update({ company_id: null })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, company_id: undefined } : user
      ));
      toast.success('User removed from company');
    } catch (error) {
      console.error('Error removing user from company:', error);
      toast.error('Failed to remove user from company');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  return {
    users,
    companies,
    loading,
    fetchUsers,
    updateUserRole,
    removeUserFromCompany
  };
};
