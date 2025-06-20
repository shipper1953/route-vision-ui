
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
      console.log('Inviting user with data:', { ...newUser, companyId });
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      
      // Call the edge function to create the user with service role permissions
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: tempPassword,
          name: newUser.name,
          role: newUser.role,
          company_id: companyId,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('User invited successfully:', result);
      
      setNewUser({ email: '', name: '', role: 'user' });
      setIsOpen(false);
      onUserInvited();
      toast.success('User invited successfully');
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(`Failed to invite user: ${error.message}`);
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
          <DialogDescription>
            Send an invitation to a new user to join this company with the specified role.
          </DialogDescription>
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
