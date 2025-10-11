
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
  company_id: string | null;
  warehouse_ids: any;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

export const useUsers = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let query = supabase.from('users').select('*');
        
        // If not super admin, filter by company
        if (!isSuperAdmin && userProfile?.company_id) {
          query = query.eq('company_id', userProfile.company_id);
        }
        
        const { data, error } = await query;
        
        if (error) {
          setError("Failed to fetch users.");
          setUsers([]);
        } else {
          // Transform database users to match User interface
          const transformedUsers: User[] = (data || []).map((user: DatabaseUser) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: 'active', // Default status since it's not in database
            lastLogin: 'Never' // Default lastLogin since it's not in database
          }));
          setUsers(transformedUsers);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError("Failed to fetch users.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (userProfile) {
      fetchUsers();
    }
  }, [userProfile, isSuperAdmin]);

  return { users, loading, error };
};
