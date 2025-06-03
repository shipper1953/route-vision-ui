
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserProfile, Company } from "@/types/auth";
import { EditUserDialog } from "../dialogs/EditUserDialog";

interface UsersTableProps {
  users: UserProfile[];
  companies: Company[];
  onUserUpdated: () => void;
}

export const UsersTable = ({ 
  users, 
  companies, 
  onUserUpdated
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
              <EditUserDialog 
                user={user} 
                companies={companies} 
                onUserUpdated={onUserUpdated} 
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
