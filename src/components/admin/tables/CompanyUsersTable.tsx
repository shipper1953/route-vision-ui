import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserProfile } from "@/types/auth";
import { UserX, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

interface CompanyUsersTableProps {
  users: UserProfile[];
  onRoleUpdate: (userId: string, newRole: 'user' | 'company_admin') => void;
  onUserRemove: (userId: string) => void;
}

export const CompanyUsersTable = ({ users, onRoleUpdate, onUserRemove }: CompanyUsersTableProps) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No users in your company yet. Invite your first user to get started.
        </p>
      </div>
    );
  }

  const sortedUsers = [...users].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleSort}
              className="h-8 px-2 lg:px-3"
            >
              Created
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedUsers.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'company_admin' ? 'default' : 'secondary'}>
                {user.role === 'company_admin' ? 'Admin' : 'User'}
              </Badge>
            </TableCell>
            <TableCell>
              {user.created_at ? (
                <div className="text-sm">
                  <div>{format(new Date(user.created_at), 'MMM d, yyyy')}</div>
                  <div className="text-muted-foreground">{format(new Date(user.created_at), 'h:mm a')}</div>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Select
                  value={user.role}
                  onValueChange={(newRole: 'user' | 'company_admin') => onRoleUpdate(user.id, newRole)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="company_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => onUserRemove(user.id)}
                >
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
