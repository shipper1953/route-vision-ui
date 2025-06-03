
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
    company_id: 'no_company'
  });

  const createUser = async () => {
    try {
      console.log('Creating user with data:', newUser);
      
      // Create user record directly in the users table
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          company_id: newUser.company_id === 'no_company' ? null : newUser.company_id,
          password: '' // They'll set this on first login
        })
        .select()
        .single();

      console.log('User creation result:', { data, error });

      if (error) throw error;

      setNewUser({ email: '', name: '', role: 'user', company_id: 'no_company' });
      setIsOpen(false);
      onUserCreated();
      toast.success('User created successfully. They will need to sign up with their email to set their password.');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${error.message}`);
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
                <SelectItem value="no_company">No Company</SelectItem>
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
