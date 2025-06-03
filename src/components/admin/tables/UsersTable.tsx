
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserProfile, Company } from "@/types/auth";
import { UserX } from "lucide-react";

interface UsersTableProps {
  users: UserProfile[];
  companies: Company[];
  onUpdateUserRole: (userId: string, newRole: 'user' | 'company_admin' | 'super_admin') => void;
  onRemoveUserFromCompany: (userId: string) => void;
}

export const UsersTable = ({ 
  users, 
  companies, 
  onUpdateUserRole, 
  onRemoveUserFromCompany 
}: UsersTableProps) => {
  const getCompanyName = (companyId?: string) => {
    if (!companyId) return 'No Company';
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  };

  return (
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
                  onValueChange={(newRole: 'user' | 'company_admin' | 'super_admin') => onUpdateUserRole(user.id, newRole)}
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
                    onClick={() => onRemoveUserFromCompany(user.id)}
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
  );
};
