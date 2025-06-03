
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserProfile } from "@/types/auth";
import { DatabaseUser } from "../types/userManagement";

export const useCompanyUsers = (companyId?: string) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform database users to UserProfile format
      const transformedUsers: UserProfile[] = (data as DatabaseUser[])?.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        warehouse_ids: Array.isArray(user.warehouse_ids) 
          ? user.warehouse_ids 
          : typeof user.warehouse_ids === 'string' 
            ? JSON.parse(user.warehouse_ids)
            : []
      })) || [];
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'company_admin') => {
    try {
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

  const removeUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ company_id: null })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.filter(user => user.id !== userId));
      toast.success('User removed from company');
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

  return {
    users,
    loading,
    fetchUsers,
    updateUserRole,
    removeUser
  };
};
