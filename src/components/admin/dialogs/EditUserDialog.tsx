
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserProfile, Company } from "@/types/auth";
import { Edit } from "lucide-react";

interface EditUserDialogProps {
  user: UserProfile;
  companies: Company[];
  onUserUpdated: () => void;
}

export const EditUserDialog = ({ user, companies, onUserUpdated }: EditUserDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [editedUser, setEditedUser] = useState({
    name: user.name,
    email: user.email,
    company_id: user.company_id || 'no_company',
    role: user.role
  });

  // Check current user's role on component mount
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        if (currentUser.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', currentUser.user.id)
            .single();
          
          setCurrentUserRole(userData?.role || '');
        }
      } catch (error) {
        console.error('Error fetching current user role:', error);
      }
    };
    checkUserRole();
  }, []);

  const updateUser = async () => {
    try {
      console.log('Updating user with data:', editedUser);
      
      // Get current user's role to verify permissions
      const { data: currentUserData } = await supabase
        .from('users')
        .select('role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      // Security check: Only super admins can change roles
      const isRoleChanged = editedUser.role !== user.role;
      if (isRoleChanged && currentUserData?.role !== 'super_admin') {
        toast.error('Only super administrators can change user roles');
        return;
      }
      
      const { error } = await supabase
        .from('users')
        .update({
          name: editedUser.name,
          email: editedUser.email,
          company_id: editedUser.company_id === 'no_company' ? null : editedUser.company_id,
          role: editedUser.role
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsOpen(false);
      onUserUpdated();
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(`Failed to update user: ${error.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={editedUser.name}
              onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
              placeholder="Enter full name"
            />
          </div>
          <div>
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={editedUser.email}
              onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
              placeholder="Enter user email"
            />
          </div>
          <div>
            <Label htmlFor="edit-company">Company</Label>
            <Select 
              value={editedUser.company_id} 
              onValueChange={(value) => setEditedUser({ ...editedUser, company_id: value })}
            >
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
          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select 
              value={editedUser.role} 
              onValueChange={(value: 'user' | 'company_admin' | 'super_admin') => setEditedUser({ ...editedUser, role: value })}
              disabled={currentUserRole !== 'super_admin'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="company_admin">Company Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            {currentUserRole !== 'super_admin' && (
              <p className="text-sm text-muted-foreground mt-1">
                Only super administrators can modify user roles
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={updateUser} className="flex-1">
              Update User
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
