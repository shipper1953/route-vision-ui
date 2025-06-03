
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Company } from "@/types/auth";
import { Plus } from "lucide-react";
import { NewUserForm } from "../types/userManagement";

interface CreateUserDialogProps {
  companies: Company[];
  onUserCreated: () => void;
}

export const CreateUserDialog = ({ companies, onUserCreated }: CreateUserDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: '',
    name: '',
    role: 'user',
    company_id: ''
  });

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
      setIsOpen(false);
      onUserCreated();
      toast.success('User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            <Select 
              value={newUser.role} 
              onValueChange={(value: 'user' | 'company_admin' | 'super_admin') => setNewUser({ ...newUser, role: value })}
            >
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
  );
};
