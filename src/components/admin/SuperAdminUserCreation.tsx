
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserProfile, Company } from "@/types/auth";
import { Plus, UserX, Edit } from "lucide-react";

interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'company_admin' | 'super_admin';
  company_id: string | null;
  warehouse_ids: any;
}

interface DatabaseCompany {
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

export const SuperAdminUserCreation = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'user' as 'user' | 'company_admin' | 'super_admin',
    company_id: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

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
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

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
      
      setCompanies(transformedCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch companies');
    }
  };

  const createUser = async () => {
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        email_confirm: true,
        user_metadata: {
          name: newUser.name
        }
      });

      if (authError) throw authError;

      // Then update the user profile with company assignment and role
      const { error: profileError } = await supabase
        .from('users')
        .update({
          company_id: newUser.company_id || null,
          role: newUser.role,
          name: newUser.name
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      setNewUser({ email: '', name: '', role: 'user', company_id: '' });
      setIsCreateDialogOpen(false);
      fetchUsers();
      toast.success('User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'company_admin' | 'super_admin') => {
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

  const removeUserFromCompany = async (userId: string) => {
    try {
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

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return 'No Company';
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Enter user email"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role} onValueChange={(value: 'user' | 'company_admin' | 'super_admin') => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="company_admin">Company Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Select value={newUser.company_id} onValueChange={(value) => setNewUser({ ...newUser, company_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createUser} className="w-full">
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'company_admin' ? 'secondary' : 'outline'}>
                    {user.role === 'super_admin' ? 'Super Admin' : user.role === 'company_admin' ? 'Company Admin' : 'User'}
                  </Badge>
                </TableCell>
                <TableCell>{getCompanyName(user.company_id)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(newRole: 'user' | 'company_admin' | 'super_admin') => updateUserRole(user.id, newRole)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="company_admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {user.company_id && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => removeUserFromCompany(user.id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
