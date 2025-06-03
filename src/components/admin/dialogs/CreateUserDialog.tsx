
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
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm & { password: string }>({
    email: '',
    name: '',
    role: 'user',
    company_id: 'no_company',
    password: ''
  });

  const generatePassword = () => {
    const password = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    setNewUser({ ...newUser, password });
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      console.log('Creating user with data:', newUser);
      
      // Call the edge function to create the user with service role permissions
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          role: newUser.role,
          company_id: newUser.company_id === 'no_company' ? null : newUser.company_id,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('User created successfully:', data);

      setNewUser({ email: '', name: '', role: 'user', company_id: 'no_company', password: '' });
      setIsOpen(false);
      onUserCreated();
      toast.success(`User created successfully! Password: ${newUser.password}`);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setIsCreating(false);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="Enter user email"
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password *</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter password"
                required
              />
              <Button type="button" variant="outline" onClick={generatePassword}>
                Generate
              </Button>
            </div>
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
          <Button onClick={createUser} className="w-full" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
