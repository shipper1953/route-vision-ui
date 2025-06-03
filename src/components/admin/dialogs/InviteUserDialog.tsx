
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface InviteUserDialogProps {
  companyId: string;
  onUserInvited: () => void;
}

export const InviteUserDialog = ({ companyId, onUserInvited }: InviteUserDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'user' as 'user' | 'company_admin'
  });

  const inviteUser = async () => {
    try {
      setIsInviting(true);
      
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

      // Then update the user profile with company assignment
      const { error: profileError } = await supabase
        .from('users')
        .update({
          company_id: companyId,
          role: newUser.role,
          name: newUser.name
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      setNewUser({ email: '', name: '', role: 'user' });
      setIsOpen(false);
      onUserInvited();
      toast.success('User invited successfully');
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New User to Company</DialogTitle>
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
            <Select value={newUser.role} onValueChange={(value: 'user' | 'company_admin') => setNewUser({ ...newUser, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="company_admin">Company Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={inviteUser} className="w-full" disabled={isInviting}>
            {isInviting ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
